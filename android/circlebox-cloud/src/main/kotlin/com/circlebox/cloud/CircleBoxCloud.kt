package com.circlebox.cloud

import android.content.Context
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.lang.reflect.InvocationHandler
import java.lang.reflect.Proxy
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.max
import kotlin.math.min
import org.json.JSONArray
import org.json.JSONObject

/**
 * Android companion uploader for CircleBox Cloud.
 */
object CircleBoxCloud {
    private const val SDK_VERSION = "0.3.1"
    private const val USAGE_STATE_FILE_NAME = "usage-beacon-state.json"

    @Volatile
    private var config: CircleBoxCloudConfig? = null
    private val paused = AtomicBoolean(false)
    private val lock = Any()
    private val uploadQueue = ArrayList<UploadTask>()
    private var queueLoaded = false
    private var queueFile: File? = null
    private var isProcessingQueue = false
    private var usageStateLoaded = false
    private var usageStateFile: File? = null
    private var usageBeaconState: UsageBeaconState? = null
    private var lifecycleObserver: DefaultLifecycleObserver? = null
    private var appInForeground = true
    private var highSignalListenerToken: String? = null
    private var highSignalListenerProxy: Any? = null
    private var lastImmediateFlushUnixMs: Long = 0
    @Volatile
    private var isSendingUsageBeacon = false
    private val scheduler = Executors.newSingleThreadScheduledExecutor { runnable ->
        Thread(runnable, "circlebox-cloud-scheduler").apply {
            isDaemon = true
        }
    }
    private var periodicFuture: ScheduledFuture<*>? = null

    private data class UploadTask(
        val id: String,
        val endpointPath: String,
        val filePath: String,
        val contentType: String,
        val idempotencyKey: String,
        val payloadBytes: Long,
        val createdUnixMs: Long,
        val attempts: Int,
        val nextAttemptUnixMs: Long,
    )

    private enum class UploadOutcome {
        SUCCESS,
        RETRYABLE,
        PERMANENT,
    }

    private data class UsageBeaconState(
        val usageDate: String,
        val activeApps: Long,
        val crashReports: Long,
        val eventsEmitted: Long,
        val lastSentUnixMs: Long,
    )

    private data class UsageSummaryIncrement(
        val crashReports: Long,
        val eventsEmitted: Long,
    )

    fun start(config: CircleBoxCloudConfig) {
        this.config = config
        paused.set(false)

        synchronized(lock) {
            resolveQueueFileLocked(emptyList())
            ensureQueueLoadedLocked()
            resolveUsageStateFileLocked()
            ensureUsageStateLoadedLocked()
            recordUsageStartLocked(config)
            saveUsageStateLocked()
            appInForeground = true
            registerLifecycleObserverLocked()
            registerHighSignalListenerLocked(config)
            configurePeriodicFlushLocked(config)
        }

        scheduler.execute {
            performForegroundDrain(checkPendingCrash = config.autoExportPendingOnStart)
        }
    }

    fun pause() {
        paused.set(true)
        synchronized(lock) {
            cancelPeriodicFlushLocked()
        }
    }

    fun resume() {
        paused.set(false)
        val localConfig = config ?: return
        synchronized(lock) {
            configurePeriodicFlushLocked(localConfig)
        }
        scheduler.execute {
            performForegroundDrain(checkPendingCrash = true)
        }
    }

    fun setUser(id: String, attrs: Map<String, String> = emptyMap()) {
        val all = LinkedHashMap(attrs)
        all["user_id"] = id
        invokeCircleBoxBreadcrumb("cloud_user_context", all)
    }

    fun captureAction(name: String, attrs: Map<String, String> = emptyMap()) {
        val all = LinkedHashMap(attrs)
        all["action_name"] = name
        invokeCircleBoxBreadcrumb("ui_action", all)
    }

    fun flush(): List<File> {
        val localConfig = config ?: error("CircleBoxCloud.start() must be called first")
        if (paused.get()) {
            return emptyList()
        }

        val files = invokeCircleBoxExportLogs()
        synchronized(lock) {
            resolveQueueFileLocked(files)
            ensureQueueLoadedLocked()
            enqueueFilesLocked(files, localConfig)
            saveQueueLocked()
        }
        processQueueIfNeeded(localConfig)

        return files
    }

    private fun performForegroundDrain(checkPendingCrash: Boolean) {
        val localConfig = config ?: return
        if (paused.get()) {
            return
        }

        if (checkPendingCrash && invokeCircleBoxHasPendingCrashReport()) {
            runCatching { flush() }
            return
        }

        if (localConfig.enableAutoFlush) {
            processQueueIfNeeded(localConfig)
        }

        sendUsageBeaconIfNeeded(localConfig, force = false)
    }

    private fun registerLifecycleObserverLocked() {
        if (lifecycleObserver != null) {
            return
        }

        val observer = object : DefaultLifecycleObserver {
            override fun onStart(owner: LifecycleOwner) {
                val localConfig = config ?: return
                synchronized(lock) {
                    appInForeground = true
                    configurePeriodicFlushLocked(localConfig)
                }
                scheduler.execute {
                    performForegroundDrain(checkPendingCrash = true)
                }
            }

            override fun onStop(owner: LifecycleOwner) {
                synchronized(lock) {
                    appInForeground = false
                    cancelPeriodicFlushLocked()
                }
            }
        }

        runCatching {
            ProcessLifecycleOwner.get().lifecycle.addObserver(observer)
            lifecycleObserver = observer
        }.onFailure {
            // Ignore lifecycle observer failures and continue best-effort.
            lifecycleObserver = null
        }
    }

    private fun registerHighSignalListenerLocked(localConfig: CircleBoxCloudConfig) {
        if (!localConfig.immediateFlushOnHighSignal) {
            unregisterHighSignalListenerLocked()
            return
        }
        if (highSignalListenerToken != null) {
            return
        }

        runCatching {
            val circleBoxClass = Class.forName("com.circlebox.sdk.CircleBox")
            val listenerInterface = Class.forName("com.circlebox.sdk.CircleBoxEventListener")
            val proxy = Proxy.newProxyInstance(
                listenerInterface.classLoader,
                arrayOf(listenerInterface),
                InvocationHandler { _, method, args ->
                    if (method.name == "onEvent" && args != null && args.isNotEmpty()) {
                        requestImmediateFlushForHighSignalEvent(args[0])
                    }
                    null
                },
            )
            val token = circleBoxClass.getMethod("addEventListener", listenerInterface)
                .invoke(null, proxy) as? String
            if (!token.isNullOrBlank()) {
                highSignalListenerToken = token
                highSignalListenerProxy = proxy
            }
        }.onFailure {
            highSignalListenerToken = null
            highSignalListenerProxy = null
        }
    }

    private fun unregisterHighSignalListenerLocked() {
        val token = highSignalListenerToken ?: return
        runCatching {
            val circleBoxClass = Class.forName("com.circlebox.sdk.CircleBox")
            circleBoxClass.getMethod("removeEventListener", String::class.java).invoke(null, token)
        }
        highSignalListenerToken = null
        highSignalListenerProxy = null
    }

    private fun requestImmediateFlushForHighSignalEvent(event: Any) {
        val localConfig = config ?: return
        if (!localConfig.immediateFlushOnHighSignal || paused.get()) {
            return
        }
        if (!isHighSignalEvent(event)) {
            return
        }

        val shouldTrigger = synchronized(lock) {
            val now = nowMs()
            if ((now - lastImmediateFlushUnixMs) < 2_000) {
                false
            } else {
                lastImmediateFlushUnixMs = now
                true
            }
        }
        if (!shouldTrigger) {
            return
        }

        scheduler.execute {
            runCatching { flush() }
            sendUsageBeaconIfNeeded(localConfig, force = false)
        }
    }

    private fun isHighSignalEvent(event: Any): Boolean {
        val type = readEventField(event, "getType")
        if (type == "native_exception_prehook") {
            return true
        }
        val severity = readEventField(event, "getSeverity")
        return severity == "error" || severity == "fatal"
    }

    private fun readEventField(event: Any, getterName: String): String {
        return runCatching {
            val raw = event.javaClass.getMethod(getterName).invoke(event)
            raw?.toString()?.trim()?.lowercase(Locale.US).orEmpty()
        }.getOrDefault("")
    }

    private fun configurePeriodicFlushLocked(localConfig: CircleBoxCloudConfig) {
        if (!localConfig.enableAutoFlush || paused.get() || !appInForeground) {
            cancelPeriodicFlushLocked()
            return
        }
        if (periodicFuture != null) {
            return
        }

        periodicFuture = scheduler.scheduleWithFixedDelay(
            {
                val currentConfig = config ?: return@scheduleWithFixedDelay
                if (paused.get()) {
                    return@scheduleWithFixedDelay
                }
                val shouldDrain = synchronized(lock) { appInForeground && currentConfig.enableAutoFlush }
                if (!shouldDrain) {
                    return@scheduleWithFixedDelay
                }
                processQueueIfNeeded(currentConfig)
            },
            localConfig.flushIntervalSec,
            localConfig.flushIntervalSec,
            TimeUnit.SECONDS,
        )
    }

    private fun cancelPeriodicFlushLocked() {
        periodicFuture?.cancel(false)
        periodicFuture = null
    }

    @Suppress("UNCHECKED_CAST")
    private fun invokeCircleBoxExportLogs(): List<File> {
        val circleBoxClass = Class.forName("com.circlebox.sdk.CircleBox")
        val exportFormatClass = Class.forName("com.circlebox.sdk.CircleBoxExportFormat")

        val enumSet = LinkedHashSet<Any>()
        listOf("SUMMARY", "JSON_GZIP").forEach { enumName ->
            val enumValue = exportFormatClass.getMethod("valueOf", String::class.java).invoke(null, enumName)
            if (enumValue != null) {
                enumSet.add(enumValue)
            }
        }

        val method = circleBoxClass.getMethod("exportLogs", Set::class.java)
        val raw = method.invoke(null, enumSet) as? List<*> ?: return emptyList()
        return raw.mapNotNull { item ->
            when (item) {
                is File -> item
                is String -> File(item)
                else -> null
            }
        }
    }

    private fun invokeCircleBoxHasPendingCrashReport(): Boolean {
        return runCatching {
            val circleBoxClass = Class.forName("com.circlebox.sdk.CircleBox")
            val method = circleBoxClass.getMethod("hasPendingCrashReport")
            (method.invoke(null) as? Boolean) == true
        }.getOrDefault(false)
    }

    private fun invokeCircleBoxBreadcrumb(message: String, attrs: Map<String, String>) {
        val circleBoxClass = Class.forName("com.circlebox.sdk.CircleBox")
        val withAttrs = runCatching {
            circleBoxClass.getMethod("breadcrumb", String::class.java, Map::class.java)
        }.getOrNull()

        if (withAttrs != null) {
            withAttrs.invoke(null, message, attrs)
        } else {
            circleBoxClass.getMethod("breadcrumb", String::class.java).invoke(null, message)
        }
    }

    private fun processQueueIfNeeded(localConfig: CircleBoxCloudConfig) {
        val shouldStart = synchronized(lock) {
            if (isProcessingQueue) {
                false
            } else {
                isProcessingQueue = true
                true
            }
        }
        if (!shouldStart) {
            return
        }

        try {
            while (true) {
                if (paused.get()) {
                    return
                }

                val task = synchronized(lock) {
                    nextReadyTaskLocked()
                } ?: return

                val file = File(task.filePath)
                val payload = runCatching { file.readBytes() }.getOrNull()
                if (payload == null) {
                    synchronized(lock) {
                        removeTaskLocked(task.id)
                        saveQueueLocked()
                    }
                    continue
                }

                val endpoint = combineEndpoint(localConfig.endpoint, task.endpointPath)
                val summaryIncrement = if (task.endpointPath == "v1/ingest/fragment") {
                    parseUsageSummaryIncrement(payload)
                } else {
                    null
                }
                val outcome = uploadOnce(
                    ingestKey = localConfig.ingestKey,
                    endpoint = endpoint,
                    payload = payload,
                    contentType = task.contentType,
                    idempotencyKey = task.idempotencyKey,
                )

                synchronized(lock) {
                    when (outcome) {
                        UploadOutcome.SUCCESS -> {
                            removeTaskLocked(task.id)
                            if (summaryIncrement != null) {
                                applyUsageSummaryIncrementLocked(localConfig, summaryIncrement)
                                saveUsageStateLocked()
                            }
                        }
                        UploadOutcome.RETRYABLE -> rescheduleTaskLocked(task.id, localConfig.retryMaxBackoffSec)
                        UploadOutcome.PERMANENT -> removeTaskLocked(task.id)
                    }
                    saveQueueLocked()
                }

                if (outcome == UploadOutcome.SUCCESS && summaryIncrement != null) {
                    sendUsageBeaconIfNeeded(localConfig, force = false)
                }
            }
        } finally {
            synchronized(lock) {
                isProcessingQueue = false
                saveQueueLocked()
            }
        }
    }

    private fun uploadOnce(
        ingestKey: String,
        endpoint: String,
        payload: ByteArray,
        contentType: String,
        idempotencyKey: String,
    ): UploadOutcome {
        val connection = URL(endpoint).openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.connectTimeout = 10_000
        connection.readTimeout = 10_000
        connection.setRequestProperty("x-circlebox-ingest-key", ingestKey)
        connection.setRequestProperty("x-circlebox-idempotency-key", idempotencyKey)
        connection.setRequestProperty("content-type", contentType)
        connection.doOutput = true

        return try {
            connection.outputStream.use { output ->
                output.write(payload)
                output.flush()
            }

            when (val code = connection.responseCode) {
                in 200..299 -> UploadOutcome.SUCCESS
                in 500..599 -> UploadOutcome.RETRYABLE
                408, 409, 425, 429 -> UploadOutcome.RETRYABLE
                else -> {
                    runCatching {
                        invokeCircleBoxBreadcrumb(
                            "cloud_upload_dropped",
                            mapOf(
                                "status_code" to code.toString(),
                                "endpoint" to endpoint,
                            ),
                        )
                    }
                    UploadOutcome.PERMANENT
                }
            }
        } catch (_: Throwable) {
            UploadOutcome.RETRYABLE
        } finally {
            connection.disconnect()
        }
    }

    private fun enqueueFilesLocked(files: List<File>, localConfig: CircleBoxCloudConfig) {
        for (file in files) {
            val payload = runCatching { file.readBytes() }.getOrNull() ?: continue
            val endpointPath = endpointPathFor(file)
            val contentType = if (file.name.endsWith(".gz")) "application/json+gzip" else "application/json"
            val idempotencyKey = buildIdempotencyKey(endpointPath, payload)
            if (uploadQueue.any { it.idempotencyKey == idempotencyKey }) {
                continue
            }

            uploadQueue += UploadTask(
                id = UUID.randomUUID().toString(),
                endpointPath = endpointPath,
                filePath = file.absolutePath,
                contentType = contentType,
                idempotencyKey = idempotencyKey,
                payloadBytes = payload.size.toLong(),
                createdUnixMs = nowMs(),
                attempts = 0,
                nextAttemptUnixMs = nowMs(),
            )
        }

        trimQueueLocked(localConfig.maxQueueMB.toLong() * 1024L * 1024L)
    }

    private fun resolveQueueFileLocked(files: List<File>) {
        if (queueFile != null) {
            return
        }

        val baseDir = resolveCircleBoxBaseDirFromContext()
            ?: run {
                val exportsDir = files.firstOrNull()?.parentFile ?: return
                exportsDir.parentFile ?: exportsDir
            }
        val cloudDir = File(baseDir, "cloud")
        cloudDir.mkdirs()
        queueFile = File(cloudDir, "upload-queue.json")
        queueLoaded = false
    }

    private fun resolveUsageStateFileLocked() {
        if (usageStateFile != null) {
            return
        }
        val queue = queueFile ?: return
        usageStateFile = File(queue.parentFile ?: return, USAGE_STATE_FILE_NAME)
        usageStateLoaded = false
    }

    private fun resolveCircleBoxBaseDirFromContext(): File? {
        return runCatching {
            val circleBoxClass = Class.forName("com.circlebox.sdk.CircleBox")
            val field = circleBoxClass.getDeclaredField("appContext")
            field.isAccessible = true
            val appContext = field.get(null) as? Context
            appContext?.filesDir?.let { File(it, "circlebox") }
        }.getOrNull()
    }

    private fun ensureQueueLoadedLocked() {
        if (queueLoaded) {
            return
        }
        val file = queueFile ?: return
        queueLoaded = true
        val content = runCatching { file.readText() }.getOrNull()
        if (content.isNullOrBlank()) {
            uploadQueue.clear()
            return
        }

        uploadQueue.clear()
        runCatching {
            val array = JSONArray(content)
            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                uploadQueue += UploadTask(
                    id = item.optString("id"),
                    endpointPath = item.optString("endpoint_path"),
                    filePath = item.optString("file_path"),
                    contentType = item.optString("content_type", "application/json"),
                    idempotencyKey = item.optString("idempotency_key"),
                    payloadBytes = item.optLong("payload_bytes"),
                    createdUnixMs = item.optLong("created_unix_ms"),
                    attempts = item.optInt("attempts"),
                    nextAttemptUnixMs = item.optLong("next_attempt_unix_ms"),
                )
            }
        }.onFailure {
            uploadQueue.clear()
        }
    }

    private fun saveQueueLocked() {
        val file = queueFile ?: return
        val serialized = JSONArray().apply {
            uploadQueue.forEach { task ->
                put(
                    JSONObject()
                        .put("id", task.id)
                        .put("endpoint_path", task.endpointPath)
                        .put("file_path", task.filePath)
                        .put("content_type", task.contentType)
                        .put("idempotency_key", task.idempotencyKey)
                        .put("payload_bytes", task.payloadBytes)
                        .put("created_unix_ms", task.createdUnixMs)
                        .put("attempts", task.attempts)
                        .put("next_attempt_unix_ms", task.nextAttemptUnixMs),
                )
            }
        }
        runCatching {
            file.parentFile?.mkdirs()
            file.writeText(serialized.toString())
        }
    }

    private fun ensureUsageStateLoadedLocked() {
        if (usageStateLoaded) {
            return
        }
        usageStateLoaded = true
        val file = usageStateFile ?: return
        val raw = runCatching { file.readText() }.getOrNull()
        usageBeaconState = if (raw.isNullOrBlank()) {
            defaultUsageState()
        } else {
            runCatching {
                val item = JSONObject(raw)
                UsageBeaconState(
                    usageDate = item.optString("usage_date", currentUsageDate()),
                    activeApps = item.optLong("active_apps", 0L).coerceAtLeast(0L),
                    crashReports = item.optLong("crash_reports", 0L).coerceAtLeast(0L),
                    eventsEmitted = item.optLong("events_emitted", 0L).coerceAtLeast(0L),
                    lastSentUnixMs = item.optLong("last_sent_unix_ms", 0L).coerceAtLeast(0L),
                )
            }.getOrElse { defaultUsageState() }
        }
        usageBeaconState = normalizeUsageState(usageBeaconState ?: defaultUsageState())
    }

    private fun saveUsageStateLocked() {
        val state = usageBeaconState ?: return
        val file = usageStateFile ?: return
        val serialized = JSONObject()
            .put("usage_date", state.usageDate)
            .put("active_apps", state.activeApps)
            .put("crash_reports", state.crashReports)
            .put("events_emitted", state.eventsEmitted)
            .put("last_sent_unix_ms", state.lastSentUnixMs)
            .toString()
        runCatching {
            file.parentFile?.mkdirs()
            file.writeText(serialized)
        }
    }

    private fun recordUsageStartLocked(localConfig: CircleBoxCloudConfig) {
        if (!localConfig.enableUsageBeacon) {
            return
        }
        ensureUsageStateLoadedLocked()
        val current = normalizeUsageState(usageBeaconState ?: defaultUsageState())
        usageBeaconState = current.copy(activeApps = current.activeApps + 1)
    }

    private fun applyUsageSummaryIncrementLocked(
        localConfig: CircleBoxCloudConfig,
        increment: UsageSummaryIncrement,
    ) {
        if (!localConfig.enableUsageBeacon) {
            return
        }
        ensureUsageStateLoadedLocked()
        val current = normalizeUsageState(usageBeaconState ?: defaultUsageState())
        usageBeaconState = current.copy(
            crashReports = current.crashReports + increment.crashReports.coerceAtLeast(0L),
            eventsEmitted = current.eventsEmitted + increment.eventsEmitted.coerceAtLeast(0L),
        )
    }

    private fun sendUsageBeaconIfNeeded(localConfig: CircleBoxCloudConfig, force: Boolean) {
        data class RequestPayload(
            val endpoint: String,
            val usageKey: String,
            val state: UsageBeaconState,
        )

        val request = synchronized(lock) {
            if (!localConfig.enableUsageBeacon || isSendingUsageBeacon) {
                return@synchronized null
            }
            val usageKey = localConfig.usageBeaconKey?.trim().orEmpty()
            if (usageKey.isEmpty()) {
                return@synchronized null
            }

            ensureUsageStateLoadedLocked()
            val state = normalizeUsageState(usageBeaconState ?: defaultUsageState())
            val minIntervalMs = localConfig.usageBeaconMinIntervalSec * 1000
            val now = nowMs()
            if (!force && (now - state.lastSentUnixMs) < minIntervalMs) {
                usageBeaconState = state
                return@synchronized null
            }

            usageBeaconState = state
            isSendingUsageBeacon = true
            val base = localConfig.usageBeaconEndpoint?.takeIf { it.isNotBlank() } ?: localConfig.endpoint
            RequestPayload(
                endpoint = combineEndpoint(base, "v1/telemetry/usage"),
                usageKey = usageKey,
                state = state,
            )
        } ?: return

        val connection = URL(request.endpoint).openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.connectTimeout = 10_000
        connection.readTimeout = 10_000
        connection.setRequestProperty("x-circlebox-usage-key", request.usageKey)
        connection.setRequestProperty("content-type", "application/json")
        connection.doOutput = true

        var success = false
        try {
            val body = JSONObject()
                .put("sdk_family", "android")
                .put("sdk_version", SDK_VERSION)
                .put("mode", localConfig.usageBeaconMode.wireValue)
                .put("usage_date", request.state.usageDate)
                .put("active_apps", request.state.activeApps)
                .put("crash_reports", request.state.crashReports)
                .put("events_emitted", request.state.eventsEmitted)
                .toString()

            connection.outputStream.use { output ->
                output.write(body.toByteArray(Charsets.UTF_8))
                output.flush()
            }

            val code = connection.responseCode
            success = code in 200..299
        } catch (_: Throwable) {
            success = false
        } finally {
            connection.disconnect()
            synchronized(lock) {
                if (success) {
                    val current = normalizeUsageState(usageBeaconState ?: defaultUsageState())
                    usageBeaconState = current.copy(lastSentUnixMs = nowMs())
                    saveUsageStateLocked()
                }
                isSendingUsageBeacon = false
            }
        }
    }

    private fun parseUsageSummaryIncrement(payload: ByteArray): UsageSummaryIncrement? {
        return runCatching {
            val decoded = JSONObject(payload.toString(Charsets.UTF_8))
            val totalEvents = decoded.optLong("total_events", 0L).coerceAtLeast(0L)
            val crashPresent = decoded.optBoolean("crash_event_present", false)
            UsageSummaryIncrement(
                crashReports = if (crashPresent) 1 else 0,
                eventsEmitted = totalEvents,
            )
        }.getOrNull()
    }

    private fun nextReadyTaskLocked(): UploadTask? {
        val now = nowMs()
        return uploadQueue
            .filter { it.nextAttemptUnixMs <= now }
            .minByOrNull { it.createdUnixMs }
    }

    private fun removeTaskLocked(id: String) {
        uploadQueue.removeAll { it.id == id }
    }

    private fun rescheduleTaskLocked(id: String, retryMaxBackoffSec: Long) {
        val index = uploadQueue.indexOfFirst { it.id == id }
        if (index < 0) {
            return
        }
        val current = uploadQueue[index]
        val attempts = current.attempts + 1
        uploadQueue[index] = current.copy(
            attempts = attempts,
            nextAttemptUnixMs = nextAttemptUnixMs(attempts, retryMaxBackoffSec),
        )
    }

    private fun trimQueueLocked(maxBytes: Long) {
        var total = uploadQueue.sumOf { it.payloadBytes }
        while (total > maxBytes) {
            val oldest = uploadQueue.minByOrNull { it.createdUnixMs } ?: break
            uploadQueue.remove(oldest)
            total -= oldest.payloadBytes
        }
    }

    private fun endpointPathFor(file: File): String {
        return if (file.name.endsWith("summary.json")) "v1/ingest/fragment" else "v1/ingest/report"
    }

    private fun combineEndpoint(base: String, endpointPath: String): String {
        val normalizedBase = base.trimEnd('/')
        val normalizedPath = endpointPath.trimStart('/')
        return "$normalizedBase/$normalizedPath"
    }

    private fun buildIdempotencyKey(endpointPath: String, payload: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256")
        digest.update(endpointPath.toByteArray(Charsets.UTF_8))
        digest.update(payload)
        return "cb_${digest.digest().toHex()}"
    }

    private fun nextAttemptUnixMs(attempts: Int, retryMaxBackoffSec: Long): Long {
        val exponent = max(0, attempts - 1)
        val base = min(1L shl min(20, exponent), retryMaxBackoffSec)
        val jitter = (Math.random() * (base * 0.25)).toLong()
        return nowMs() + max(100L, (base + jitter) * 1000L)
    }

    private fun nowMs(): Long = System.currentTimeMillis()

    private fun defaultUsageState(): UsageBeaconState {
        return UsageBeaconState(
            usageDate = currentUsageDate(),
            activeApps = 0,
            crashReports = 0,
            eventsEmitted = 0,
            lastSentUnixMs = 0,
        )
    }

    private fun normalizeUsageState(state: UsageBeaconState): UsageBeaconState {
        val today = currentUsageDate()
        if (state.usageDate == today) {
            return state
        }
        return defaultUsageState()
    }

    private fun currentUsageDate(): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        formatter.timeZone = TimeZone.getTimeZone("UTC")
        return formatter.format(Date())
    }

    private fun ByteArray.toHex(): String = joinToString(separator = "") { byte ->
        "%02x".format(byte)
    }
}
