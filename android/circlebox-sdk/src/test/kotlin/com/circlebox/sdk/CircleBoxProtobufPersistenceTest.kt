package com.circlebox.sdk

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class CircleBoxProtobufPersistenceTest {
    @Test
    fun roundTripEnvelope() {
        val envelope = makeEnvelope()
        val encoded = CircleBoxProtobufPersistence.encodeEnvelope(envelope)
        val decoded = CircleBoxProtobufPersistence.decodeEnvelope(encoded)

        assertNotNull(decoded)
        assertEquals(envelope.sessionId, decoded?.sessionId)
        assertEquals(envelope.captureReason, decoded?.captureReason)
    }

    @Test
    fun decodesLegacyJsonBytes() {
        val envelope = makeEnvelope()
        val legacy = CircleBoxSerializer.encodeEnvelope(envelope).toByteArray(Charsets.UTF_8)
        val decoded = CircleBoxProtobufPersistence.decodeEnvelope(legacy)

        assertNotNull(decoded)
        assertEquals(envelope.sessionId, decoded?.sessionId)
        assertEquals(envelope.schemaVersion, decoded?.schemaVersion)
    }

    private fun makeEnvelope(): CircleBoxEnvelope {
        return CircleBoxEnvelope(
            sessionId = "s1",
            platform = "android",
            appVersion = "1.0",
            buildNumber = "1",
            osVersion = "14",
            deviceModel = "Pixel",
            exportSource = CircleBoxExportSource.PENDING_CRASH,
            captureReason = CircleBoxCaptureReason.UNCAUGHT_EXCEPTION,
            generatedAtUnixMs = 2000,
            events = emptyList()
        )
    }
}
