package com.circlebox.sdk

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.zip.GZIPInputStream

class CircleBoxSerializerTest {
    @Test
    fun summaryIncludesCountsAndCrashFlag() {
        val envelope = CircleBoxEnvelope(
            sessionId = "s1",
            platform = "android",
            appVersion = "1.0",
            buildNumber = "1",
            osVersion = "14",
            deviceModel = "Pixel",
            generatedAtUnixMs = 2000,
            events = listOf(
                CircleBoxEvent(
                    seq = 0,
                    timestampUnixMs = 1000,
                    uptimeMs = 10,
                    type = "breadcrumb",
                    thread = CircleBoxEventThread.MAIN,
                    severity = CircleBoxEventSeverity.INFO,
                    attrs = mapOf("message" to "start")
                ),
                CircleBoxEvent(
                    seq = 1,
                    timestampUnixMs = 1500,
                    uptimeMs = 15,
                    type = "native_exception_prehook",
                    thread = CircleBoxEventThread.CRASH,
                    severity = CircleBoxEventSeverity.FATAL,
                    attrs = mapOf("details" to "boom")
                )
            )
        )

        val summary = CircleBoxSerializer.encodeSummary(envelope, exportSource = "pending_crash")
        val json = Json.parseToJsonElement(summary).jsonObject

        assertEquals("pending_crash", json["export_source"]?.jsonPrimitive?.content)
        assertEquals("manual_export", json["capture_reason"]?.jsonPrimitive?.content)
        assertEquals("2", json["schema_version"]?.jsonPrimitive?.content)
        assertEquals(2, json["total_events"]?.jsonPrimitive?.content?.toInt())
        assertEquals(true, json["crash_event_present"]?.jsonPrimitive?.content?.toBoolean())
    }

    @Test
    fun gzipProducesGzipHeaderAndRoundTrips() {
        val raw = "circlebox,circlebox,circlebox,circlebox,circlebox"
        val compressed = CircleBoxSerializer.gzip(raw)

        assertTrue(compressed.size > 2)
        assertEquals(0x1f.toByte(), compressed[0])
        assertEquals(0x8b.toByte(), compressed[1])

        val restored = GZIPInputStream(compressed.inputStream()).bufferedReader().use { it.readText() }
        assertEquals(raw, restored)
    }

    @Test
    fun csvIncludesMetadataHeader() {
        val envelope = CircleBoxEnvelope(
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

        val csv = CircleBoxSerializer.toCsv(envelope)
        assertTrue(csv.contains("meta,schema_version,export_source,capture_reason"))
        assertTrue(csv.contains("pending_crash"))
        assertTrue(csv.contains("uncaught_exception"))
    }
}
