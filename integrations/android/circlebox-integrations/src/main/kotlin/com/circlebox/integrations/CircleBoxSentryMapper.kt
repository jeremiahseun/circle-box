package com.circlebox.integrations

object CircleBoxSentryMapper {
    fun breadcrumbs(envelope: CircleBoxAdapterEnvelope): List<CircleBoxSentryBreadcrumb> {
        return envelope.events.map { event -> breadcrumb(event, sdk = "android", mode = "export_adapter") }
    }

    fun breadcrumb(
        event: CircleBoxAdapterEvent,
        sdk: String = "android",
        mode: String = "realtime_adapter"
    ): CircleBoxSentryBreadcrumb {
        return CircleBoxSentryBreadcrumb(
            category = "circlebox.${event.type}",
            level = levelFor(event.severity),
            message = event.attrs["message"] ?: event.type,
            timestampUnixMs = event.timestampUnixMs,
            data = linkedMapOf(
                "thread" to event.thread,
                "severity" to event.severity,
                "circlebox_source" to "circlebox",
                "circlebox_mode" to mode,
                "circlebox_sdk" to sdk
            ) + event.attrs
        )
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
