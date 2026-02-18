package com.circlebox.sdk

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.ByteArrayOutputStream
import java.util.zip.GZIPOutputStream

@Serializable
private data class CircleBoxSummaryEvent(
    @SerialName("seq") val seq: Long,
    @SerialName("timestamp_unix_ms") val timestampUnixMs: Long,
    @SerialName("type") val type: String,
    @SerialName("thread") val thread: String,
    @SerialName("severity") val severity: String,
    @SerialName("attrs") val attrs: Map<String, String>
)

@Serializable
private data class CircleBoxSummary(
    @SerialName("schema_version") val schemaVersion: Int,
    @SerialName("generated_at_unix_ms") val generatedAtUnixMs: Long,
    @SerialName("export_source") val exportSource: String,
    @SerialName("session_id") val sessionId: String,
    @SerialName("platform") val platform: String,
    @SerialName("app_version") val appVersion: String,
    @SerialName("build_number") val buildNumber: String,
    @SerialName("os_version") val osVersion: String,
    @SerialName("device_model") val deviceModel: String,
    @SerialName("total_events") val totalEvents: Int,
    @SerialName("first_event_unix_ms") val firstEventUnixMs: Long?,
    @SerialName("last_event_unix_ms") val lastEventUnixMs: Long?,
    @SerialName("duration_ms") val durationMs: Long?,
    @SerialName("crash_event_present") val crashEventPresent: Boolean,
    @SerialName("event_type_counts") val eventTypeCounts: Map<String, Int>,
    @SerialName("severity_counts") val severityCounts: Map<String, Int>,
    @SerialName("thread_counts") val threadCounts: Map<String, Int>,
    @SerialName("last_events") val lastEvents: List<CircleBoxSummaryEvent>
)

@OptIn(ExperimentalSerializationApi::class)
internal object CircleBoxSerializer {
    private val json = Json {
        prettyPrint = true
        encodeDefaults = true
        explicitNulls = false
    }

    fun encodeEnvelope(envelope: CircleBoxEnvelope): String {
        return json.encodeToString(envelope)
    }

    fun decodeEnvelope(raw: String): CircleBoxEnvelope? {
        return runCatching { json.decodeFromString<CircleBoxEnvelope>(raw) }.getOrNull()
    }

    fun toCsv(envelope: CircleBoxEnvelope): String {
        val lines = ArrayList<String>(envelope.events.size + 1)
        lines += "seq,timestamp_unix_ms,uptime_ms,type,thread,severity,attrs_json"

        envelope.events.forEach { event ->
            val attrsJson = json.encodeToString(event.attrs)
            lines += listOf(
                event.seq.toString(),
                event.timestampUnixMs.toString(),
                event.uptimeMs.toString(),
                csvEscape(event.type),
                csvEscape(event.thread.name.lowercase()),
                csvEscape(event.severity.name.lowercase()),
                csvEscape(attrsJson)
            ).joinToString(",")
        }

        return lines.joinToString("\n")
    }

    fun encodeSummary(
        envelope: CircleBoxEnvelope,
        exportSource: String,
        maxRecentEvents: Int = 10
    ): String {
        val eventTypeCounts = LinkedHashMap<String, Int>()
        val severityCounts = LinkedHashMap<String, Int>()
        val threadCounts = LinkedHashMap<String, Int>()

        envelope.events.forEach { event ->
            eventTypeCounts[event.type] = (eventTypeCounts[event.type] ?: 0) + 1
            val severity = event.severity.name.lowercase()
            severityCounts[severity] = (severityCounts[severity] ?: 0) + 1
            val thread = event.thread.name.lowercase()
            threadCounts[thread] = (threadCounts[thread] ?: 0) + 1
        }

        val firstTimestamp = envelope.events.firstOrNull()?.timestampUnixMs
        val lastTimestamp = envelope.events.lastOrNull()?.timestampUnixMs
        val durationMs = if (firstTimestamp != null && lastTimestamp != null) {
            lastTimestamp - firstTimestamp
        } else {
            null
        }
        val hasCrashEvent = envelope.events.any { event ->
            event.type == "native_exception_prehook" || event.severity == CircleBoxEventSeverity.FATAL
        }

        val recentCount = maxRecentEvents.coerceAtLeast(0)
        val lastEvents = envelope.events.takeLast(recentCount).map { event ->
            CircleBoxSummaryEvent(
                seq = event.seq,
                timestampUnixMs = event.timestampUnixMs,
                type = event.type,
                thread = event.thread.name.lowercase(),
                severity = event.severity.name.lowercase(),
                attrs = event.attrs
            )
        }

        val summary = CircleBoxSummary(
            schemaVersion = envelope.schemaVersion,
            generatedAtUnixMs = envelope.generatedAtUnixMs,
            exportSource = exportSource,
            sessionId = envelope.sessionId,
            platform = envelope.platform,
            appVersion = envelope.appVersion,
            buildNumber = envelope.buildNumber,
            osVersion = envelope.osVersion,
            deviceModel = envelope.deviceModel,
            totalEvents = envelope.events.size,
            firstEventUnixMs = firstTimestamp,
            lastEventUnixMs = lastTimestamp,
            durationMs = durationMs,
            crashEventPresent = hasCrashEvent,
            eventTypeCounts = eventTypeCounts,
            severityCounts = severityCounts,
            threadCounts = threadCounts,
            lastEvents = lastEvents
        )

        return json.encodeToString(summary)
    }

    fun gzip(data: ByteArray): ByteArray {
        val output = ByteArrayOutputStream()
        GZIPOutputStream(output).use { gzip ->
            gzip.write(data)
        }
        return output.toByteArray()
    }

    fun gzip(raw: String): ByteArray {
        return gzip(raw.toByteArray(Charsets.UTF_8))
    }

    private fun csvEscape(value: String): String {
        val escaped = value.replace("\"", "\"\"")
        return if (escaped.contains(",") || escaped.contains("\n") || escaped.contains("\"")) {
            "\"$escaped\""
        } else {
            escaped
        }
    }
}
