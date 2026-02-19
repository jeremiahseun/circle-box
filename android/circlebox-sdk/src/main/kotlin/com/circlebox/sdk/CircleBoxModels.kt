package com.circlebox.sdk

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Thread category where an event was emitted. */
@Serializable
enum class CircleBoxEventThread {
    @SerialName("main")
    MAIN,

    @SerialName("background")
    BACKGROUND,

    @SerialName("crash")
    CRASH
}

/** Severity level for an event entry. */
@Serializable
enum class CircleBoxEventSeverity {
    @SerialName("info")
    INFO,

    @SerialName("warn")
    WARN,

    @SerialName("error")
    ERROR,

    @SerialName("fatal")
    FATAL
}

/** Source category for an exported envelope. */
@Serializable
enum class CircleBoxExportSource {
    @SerialName("pending_crash")
    PENDING_CRASH,

    @SerialName("live_snapshot")
    LIVE_SNAPSHOT
}

/** Why this envelope was captured. */
@Serializable
enum class CircleBoxCaptureReason {
    @SerialName("uncaught_exception")
    UNCAUGHT_EXCEPTION,

    @SerialName("manual_export")
    MANUAL_EXPORT,

    @SerialName("startup_pending_detection")
    STARTUP_PENDING_DETECTION
}

/** Single ring-buffer event entry. */
@Serializable
data class CircleBoxEvent(
    @SerialName("seq") val seq: Long,
    @SerialName("timestamp_unix_ms") val timestampUnixMs: Long,
    @SerialName("uptime_ms") val uptimeMs: Long,
    @SerialName("type") val type: String,
    @SerialName("thread") val thread: CircleBoxEventThread,
    @SerialName("severity") val severity: CircleBoxEventSeverity,
    @SerialName("attrs") val attrs: Map<String, String>
)

/** Top-level report envelope exported to JSON and used to generate CSV. */
@Serializable
data class CircleBoxEnvelope(
    @SerialName("schema_version") val schemaVersion: Int = 2,
    @SerialName("session_id") val sessionId: String,
    @SerialName("platform") val platform: String,
    @SerialName("app_version") val appVersion: String,
    @SerialName("build_number") val buildNumber: String,
    @SerialName("os_version") val osVersion: String,
    @SerialName("device_model") val deviceModel: String,
    @SerialName("export_source") val exportSource: CircleBoxExportSource = CircleBoxExportSource.LIVE_SNAPSHOT,
    @SerialName("capture_reason") val captureReason: CircleBoxCaptureReason = CircleBoxCaptureReason.MANUAL_EXPORT,
    @SerialName("generated_at_unix_ms") val generatedAtUnixMs: Long,
    @SerialName("events") val events: List<CircleBoxEvent>
)
