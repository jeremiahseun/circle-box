package com.circlebox.sdk

internal object CircleBoxSanitizer {
    // Operational telemetry keys that are safe to keep for debugging.
    private val safeTelemetryKeys = setOf(
        "available_bytes",
        "blocked_ms",
        "threshold_ms",
        "buffer_capacity",
        "disk_check_interval_sec",
        "signal_number",
        "uptime_ms",
        "timestamp_unix_ms"
    )

    private val emailRegex = Regex("[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", RegexOption.IGNORE_CASE)
    private val phoneRegex = Regex("\\+?[0-9][0-9\\-() ]{7,}[0-9]")
    private val cardRegex = Regex("\\b(?:\\d[ -]*?){13,19}\\b")

    fun sanitize(attrs: Map<String, String>, config: CircleBoxConfig): Map<String, String> {
        if (attrs.isEmpty()) {
            return attrs
        }

        val output = LinkedHashMap<String, String>(attrs.size)
        attrs.forEach { (key, value) ->
            var sanitized = if (value.length > config.maxAttributeLength) {
                value.take(config.maxAttributeLength)
            } else {
                value
            }

            if (config.sanitizeAttributes && shouldRedact(key, sanitized)) {
                sanitized = "[REDACTED]"
            }

            output[key] = sanitized
        }

        return output
    }

    private fun shouldRedact(key: String, value: String): Boolean {
        if (safeTelemetryKeys.contains(key.lowercase())) {
            return false
        }
        return emailRegex.containsMatchIn(value)
            || phoneRegex.containsMatchIn(value)
            || cardRegex.containsMatchIn(value)
    }
}
