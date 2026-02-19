package com.circlebox.sdk

import android.content.Context
import android.os.Looper
import android.os.SystemClock

internal class CircleBoxRuntime(
    context: Context
) {
    private val appContext = context.applicationContext
    private val lock = Any()

    private var config = CircleBoxConfig()
    private var environment = CircleBoxEnvironmentFactory.capture(appContext)
    private var ringBuffer = CircleBoxRingBuffer<CircleBoxEvent>(config.bufferCapacity)
    private var fileStore = CircleBoxFileStore(appContext)
    private var collectors: CircleBoxSignalCollectors? = null
    private var crashHandler: CircleBoxCrashHandler? = null
    private var started = false

    fun start(config: CircleBoxConfig) {
        synchronized(lock) {
            // Startup is idempotent: first successful call configures the runtime.
            if (started) {
                return
            }
            started = true
            this.config = config
            this.environment = CircleBoxEnvironmentFactory.capture(appContext)
            this.ringBuffer = CircleBoxRingBuffer(config.bufferCapacity)
            this.fileStore = CircleBoxFileStore(appContext)
        }

        val collectors = CircleBoxSignalCollectors(
            context = appContext,
            config = config,
            fileStore = fileStore,
            sink = { type, severity, attrs, thread ->
                record(type, severity, attrs, thread)
            }
        )
        this.collectors = collectors
        collectors.start()

        val crashHandler = CircleBoxCrashHandler { thread, throwable ->
            handleCrash(thread, throwable)
        }
        crashHandler.install()
        this.crashHandler = crashHandler

        record(
            type = "sdk_start",
            severity = CircleBoxEventSeverity.INFO,
            attrs = mapOf("buffer_capacity" to config.bufferCapacity.toString()),
            thread = CircleBoxEventThread.MAIN
        )
        writeCheckpointBestEffort()
    }

    fun breadcrumb(message: String, attrs: Map<String, String>) {
        val allAttrs = LinkedHashMap(attrs)
        allAttrs["message"] = message
        record(
            type = "breadcrumb",
            severity = CircleBoxEventSeverity.INFO,
            attrs = allAttrs,
            thread = currentThreadType()
        )
    }

    fun exportLogs(formats: Set<CircleBoxExportFormat>): List<java.io.File> {
        // Pending crash reports (from previous process runs) take precedence.
        val pendingEnvelope = fileStore.readPendingEnvelope()
        val envelope = normalizeEnvelope(
            pendingEnvelope ?: snapshotEnvelope(
                exportSource = CircleBoxExportSource.LIVE_SNAPSHOT,
                captureReason = CircleBoxCaptureReason.MANUAL_EXPORT
            ),
            fallbackExportSource = if (pendingEnvelope == null) CircleBoxExportSource.LIVE_SNAPSHOT else CircleBoxExportSource.PENDING_CRASH,
            fallbackCaptureReason = if (pendingEnvelope == null) CircleBoxCaptureReason.MANUAL_EXPORT else CircleBoxCaptureReason.STARTUP_PENDING_DETECTION
        )
        val exports = ArrayList<java.io.File>()

        if (formats.contains(CircleBoxExportFormat.JSON)) {
            exports += fileStore.writeExport(CircleBoxSerializer.encodeEnvelope(envelope), "json")
        }
        if (formats.contains(CircleBoxExportFormat.CSV)) {
            exports += fileStore.writeExport(CircleBoxSerializer.toCsv(envelope), "csv")
        }
        if (formats.contains(CircleBoxExportFormat.JSON_GZIP)) {
            val raw = CircleBoxSerializer.encodeEnvelope(envelope)
            exports += fileStore.writeExport(CircleBoxSerializer.gzip(raw), "json.gz")
        }
        if (formats.contains(CircleBoxExportFormat.CSV_GZIP)) {
            val raw = CircleBoxSerializer.toCsv(envelope)
            exports += fileStore.writeExport(CircleBoxSerializer.gzip(raw), "csv.gz")
        }
        if (formats.contains(CircleBoxExportFormat.SUMMARY)) {
            val summary = CircleBoxSerializer.encodeSummary(envelope, exportSource = envelope.exportSource.name.lowercase())
            exports += fileStore.writeExport(summary, "summary.json")
        }

        return exports
    }

    fun hasPendingCrashReport(): Boolean = fileStore.hasPendingCrashReport()

    fun clearPendingCrashReport() {
        fileStore.clearPendingCrashReport()
    }

    fun debugSnapshot(maxEvents: Int): List<CircleBoxEvent> {
        val localConfig = synchronized(lock) { config }
        if (!localConfig.enableDebugViewer) {
            return emptyList()
        }

        val events = ringBuffer.snapshot()
        val clamped = maxOf(1, maxEvents)
        return events.takeLast(clamped)
    }

    private fun handleCrash(thread: Thread, throwable: Throwable) {
        record(
            type = "native_exception_prehook",
            severity = CircleBoxEventSeverity.FATAL,
            attrs = mapOf(
                "thread" to thread.name,
                "throwable" to throwable.javaClass.name,
                "message" to (throwable.message ?: "unknown")
            ),
            thread = CircleBoxEventThread.CRASH,
            persistCheckpoint = false
        )

        runCatching {
            // Keep crash path best-effort and minimal.
            fileStore.writePendingEnvelope(
                snapshotEnvelope(
                    exportSource = CircleBoxExportSource.PENDING_CRASH,
                    captureReason = CircleBoxCaptureReason.UNCAUGHT_EXCEPTION
                )
            )
        }
    }

    private fun snapshotEnvelope(
        exportSource: CircleBoxExportSource = CircleBoxExportSource.LIVE_SNAPSHOT,
        captureReason: CircleBoxCaptureReason = CircleBoxCaptureReason.MANUAL_EXPORT
    ): CircleBoxEnvelope {
        val env = environment
        return CircleBoxEnvelope(
            sessionId = env.sessionId,
            platform = env.platform,
            appVersion = env.appVersion,
            buildNumber = env.buildNumber,
            osVersion = env.osVersion,
            deviceModel = env.deviceModel,
            exportSource = exportSource,
            captureReason = captureReason,
            generatedAtUnixMs = nowMs(),
            events = ringBuffer.snapshot()
        )
    }

    private fun normalizeEnvelope(
        envelope: CircleBoxEnvelope,
        fallbackExportSource: CircleBoxExportSource,
        fallbackCaptureReason: CircleBoxCaptureReason
    ): CircleBoxEnvelope {
        val source = if (envelope.schemaVersion < 2) fallbackExportSource else envelope.exportSource
        val reason = if (envelope.schemaVersion < 2) fallbackCaptureReason else envelope.captureReason

        return envelope.copy(
            schemaVersion = maxOf(2, envelope.schemaVersion),
            exportSource = source,
            captureReason = reason
        )
    }

    private fun record(
        type: String,
        severity: CircleBoxEventSeverity,
        attrs: Map<String, String>,
        thread: CircleBoxEventThread,
        persistCheckpoint: Boolean = true
    ) {
        val localConfig = synchronized(lock) { config }
        val sanitized = CircleBoxSanitizer.sanitize(attrs, localConfig)

        ringBuffer.append { seq ->
            CircleBoxEvent(
                seq = seq,
                timestampUnixMs = nowMs(),
                uptimeMs = SystemClock.elapsedRealtime(),
                type = type,
                thread = thread,
                severity = severity,
                attrs = sanitized
            )
        }

        if (persistCheckpoint) {
            writeCheckpointBestEffort()
        }
    }

    private fun writeCheckpointBestEffort() {
        runCatching { fileStore.writeCheckpointEnvelope(snapshotEnvelope()) }
    }

    private fun currentThreadType(): CircleBoxEventThread {
        return if (Looper.myLooper() == Looper.getMainLooper()) {
            CircleBoxEventThread.MAIN
        } else {
            CircleBoxEventThread.BACKGROUND
        }
    }

    private fun nowMs(): Long = System.currentTimeMillis()
}
