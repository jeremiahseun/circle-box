package com.circlebox.integrations

object CircleBoxPostHogMapper {
    fun event(
        envelope: CircleBoxAdapterEnvelope,
        name: String = "circlebox_context",
        sdk: String = "android",
        mode: String = "export_adapter"
    ): CircleBoxPostHogEvent {
        val typeCounts = linkedMapOf<String, Int>()
        val severityCounts = linkedMapOf<String, Int>()
        envelope.events.forEach { event ->
            typeCounts[event.type] = (typeCounts[event.type] ?: 0) + 1
            severityCounts[event.severity] = (severityCounts[event.severity] ?: 0) + 1
        }

        val properties = linkedMapOf(
            "schema_version" to envelope.schemaVersion.toString(),
            "session_id" to envelope.sessionId,
            "platform" to envelope.platform,
            "export_source" to envelope.exportSource,
            "capture_reason" to envelope.captureReason,
            "total_events" to envelope.events.size.toString(),
            "event_type_counts" to compactJsonCountMap(typeCounts),
            "severity_counts" to compactJsonCountMap(severityCounts),
            "circlebox_source" to "circlebox",
            "circlebox_mode" to mode,
            "circlebox_sdk" to sdk
        )
        envelope.events.lastOrNull()?.let { last ->
            properties["last_event_type"] = last.type
            properties["last_event_severity"] = last.severity
        }

        return CircleBoxPostHogEvent(event = name, properties = properties)
    }

    fun event(
        event: CircleBoxAdapterEvent,
        name: String = "circlebox_realtime_event",
        sdk: String = "android"
    ): CircleBoxPostHogEvent {
        return CircleBoxPostHogEvent(
            event = name,
            properties = linkedMapOf(
                "seq" to event.seq.toString(),
                "timestamp_unix_ms" to event.timestampUnixMs.toString(),
                "uptime_ms" to event.uptimeMs.toString(),
                "type" to event.type,
                "thread" to event.thread,
                "severity" to event.severity,
                "attrs_json" to compactJsonStringMap(event.attrs),
                "circlebox_source" to "circlebox",
                "circlebox_mode" to "realtime_adapter",
                "circlebox_sdk" to sdk
            )
        )
    }

    private fun compactJsonCountMap(input: Map<String, Int>): String {
        val normalized = input.entries.sortedBy { it.key }
            .joinToString(prefix = "{", postfix = "}") { (key, value) ->
                "\"${escapeJson(key)}\":${value}"
            }
        return normalized
    }

    private fun compactJsonStringMap(input: Map<String, String>): String {
        val normalized = input.entries.sortedBy { it.key }
            .joinToString(prefix = "{", postfix = "}") { (key, value) ->
                "\"${escapeJson(key)}\":\"${escapeJson(value)}\""
            }
        return normalized
    }

    private fun escapeJson(value: String): String {
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
    }
}
