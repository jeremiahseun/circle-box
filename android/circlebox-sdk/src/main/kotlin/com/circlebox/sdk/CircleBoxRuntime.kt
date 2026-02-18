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
        val envelope = pendingEnvelope ?: snapshotEnvelope()
        val exportSource = if (pendingEnvelope == null) "live_snapshot" else "pending_crash"
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
            val summary = CircleBoxSerializer.encodeSummary(envelope, exportSource = exportSource)
            exports += fileStore.writeExport(summary, "summary.json")
        }

        return exports
    }

    fun hasPendingCrashReport(): Boolean = fileStore.hasPendingCrashReport()

    fun clearPendingCrashReport() {
        fileStore.clearPendingCrashReport()
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
            thread = CircleBoxEventThread.CRASH
        )

        runCatching {
            // Keep crash path best-effort and minimal.
            fileStore.writePendingEnvelope(snapshotEnvelope())
        }
    }

    private fun snapshotEnvelope(): CircleBoxEnvelope {
        val env = environment
        return CircleBoxEnvelope(
            sessionId = env.sessionId,
            platform = env.platform,
            appVersion = env.appVersion,
            buildNumber = env.buildNumber,
            osVersion = env.osVersion,
            deviceModel = env.deviceModel,
            generatedAtUnixMs = nowMs(),
            events = ringBuffer.snapshot()
        )
    }

    private fun record(
        type: String,
        severity: CircleBoxEventSeverity,
        attrs: Map<String, String>,
        thread: CircleBoxEventThread
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
