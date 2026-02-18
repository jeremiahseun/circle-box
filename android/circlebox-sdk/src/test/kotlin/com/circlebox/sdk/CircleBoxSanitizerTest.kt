package com.circlebox.sdk

import org.junit.Assert.assertEquals
import org.junit.Test

class CircleBoxSanitizerTest {
    @Test
    fun redactsCommonPatterns() {
        val config = CircleBoxConfig(sanitizeAttributes = true)
        val attrs = mapOf(
            "email" to "person@example.com",
            "phone" to "+1 (555) 111-2222",
            "card" to "4111 1111 1111 1111",
            "safe" to "hello"
        )

        val out = CircleBoxSanitizer.sanitize(attrs, config)

        assertEquals("[REDACTED]", out["email"])
        assertEquals("[REDACTED]", out["phone"])
        assertEquals("[REDACTED]", out["card"])
        assertEquals("hello", out["safe"])
    }

    @Test
    fun truncatesLongValues() {
        val config = CircleBoxConfig(maxAttributeLength = 8)
        val out = CircleBoxSanitizer.sanitize(mapOf("value" to "0123456789abcdef"), config)

        assertEquals("01234567", out["value"])
    }
}
