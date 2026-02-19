package com.circlebox.integrations

object CircleBoxPostHogMapper {
    fun event(
        envelope: CircleBoxAdapterEnvelope,
        name: String = "circlebox_context"
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
            "event_type_counts" to typeCounts.toString(),
            "severity_counts" to severityCounts.toString()
        )
        envelope.events.lastOrNull()?.let { last ->
            properties["last_event_type"] = last.type
            properties["last_event_severity"] = last.severity
        }

        return CircleBoxPostHogEvent(event = name, properties = properties)
    }
}
