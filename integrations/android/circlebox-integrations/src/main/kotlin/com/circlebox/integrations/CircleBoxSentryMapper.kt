package com.circlebox.integrations

object CircleBoxSentryMapper {
    fun breadcrumbs(envelope: CircleBoxAdapterEnvelope): List<CircleBoxSentryBreadcrumb> {
        return envelope.events.map { event ->
            CircleBoxSentryBreadcrumb(
                category = event.type,
                level = levelFor(event.severity),
                message = event.attrs["message"] ?: event.type,
                timestampUnixMs = event.timestampUnixMs,
                data = linkedMapOf("thread" to event.thread, "severity" to event.severity) + event.attrs
            )
        }
    }

    private fun levelFor(severity: String): String {
        return when (severity) {
            "fatal" -> "fatal"
            "error" -> "error"
            "warn" -> "warning"
            else -> "info"
        }
    }
}
