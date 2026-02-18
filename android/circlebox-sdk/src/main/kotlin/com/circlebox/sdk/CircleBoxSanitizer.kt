package com.circlebox.sdk

internal object CircleBoxSanitizer {
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

            if (config.sanitizeAttributes && shouldRedact(sanitized)) {
                sanitized = "[REDACTED]"
            }

            output[key] = sanitized
        }

        return output
    }

    private fun shouldRedact(value: String): Boolean {
        return emailRegex.containsMatchIn(value)
            || phoneRegex.containsMatchIn(value)
            || cardRegex.containsMatchIn(value)
    }
}
