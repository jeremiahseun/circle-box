package com.circlebox.sdk

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

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

    private fun csvEscape(value: String): String {
        val escaped = value.replace("\"", "\"\"")
        return if (escaped.contains(",") || escaped.contains("\n") || escaped.contains("\"")) {
            "\"$escaped\""
        } else {
            escaped
        }
    }
}
