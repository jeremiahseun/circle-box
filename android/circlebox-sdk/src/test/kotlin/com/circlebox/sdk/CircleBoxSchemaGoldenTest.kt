package com.circlebox.sdk

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Test
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Paths

class CircleBoxSchemaGoldenTest {
    @Test
    fun androidLiveSnapshotMatchesGoldenFixture() {
        val envelope = makeAndroidLiveSnapshotEnvelope()
        assertEnvelopeMatchesFixture(envelope, "android-live-snapshot.json")
    }

    @Test
    fun androidPendingCrashMatchesGoldenFixture() {
        val envelope = makeAndroidPendingCrashEnvelope()
        assertEnvelopeMatchesFixture(envelope, "android-pending-crash.json")
    }

    private fun assertEnvelopeMatchesFixture(envelope: CircleBoxEnvelope, fixtureName: String) {
        val generated = CircleBoxSerializer.encodeEnvelope(envelope)
        val fixture = String(Files.readAllBytes(fixturePath(fixtureName)), StandardCharsets.UTF_8)

        val generatedJson = Json.parseToJsonElement(generated)
        val fixtureJson = Json.parseToJsonElement(fixture)
        assertEquals("Generated envelope does not match fixture $fixtureName", fixtureJson, generatedJson)
    }

    private fun fixturePath(name: String) = Paths.get("")
        .toAbsolutePath()
        .resolve("../../docs/fixtures/schema-v2/$name")
        .normalize()

    private fun makeAndroidLiveSnapshotEnvelope(): CircleBoxEnvelope {
        return CircleBoxEnvelope(
            schemaVersion = 2,
            sessionId = "ANDROID-SAMPLE-SESSION",
            platform = "android",
            appVersion = "1.0",
            buildNumber = "1",
            osVersion = "14",
            deviceModel = "Pixel",
            exportSource = CircleBoxExportSource.LIVE_SNAPSHOT,
            captureReason = CircleBoxCaptureReason.MANUAL_EXPORT,
            generatedAtUnixMs = 1771490003000,
            events = listOf(
                CircleBoxEvent(
                    seq = 0,
                    timestampUnixMs = 1771490001000,
                    uptimeMs = 100,
                    type = "sdk_start",
                    thread = CircleBoxEventThread.MAIN,
                    severity = CircleBoxEventSeverity.INFO,
                    attrs = mapOf("buffer_capacity" to "200")
                ),
                CircleBoxEvent(
                    seq = 1,
                    timestampUnixMs = 1771490002000,
                    uptimeMs = 200,
                    type = "breadcrumb",
                    thread = CircleBoxEventThread.MAIN,
                    severity = CircleBoxEventSeverity.INFO,
                    attrs = mapOf(
                        "flow" to "checkout",
                        "message" to "User started Checkout"
                    )
                )
            )
        )
    }

    private fun makeAndroidPendingCrashEnvelope(): CircleBoxEnvelope {
        return CircleBoxEnvelope(
            schemaVersion = 2,
            sessionId = "ANDROID-PENDING-SESSION",
            platform = "android",
            appVersion = "1.0",
            buildNumber = "1",
            osVersion = "14",
            deviceModel = "Pixel",
            exportSource = CircleBoxExportSource.PENDING_CRASH,
            captureReason = CircleBoxCaptureReason.UNCAUGHT_EXCEPTION,
            generatedAtUnixMs = 1771490113000,
            events = listOf(
                CircleBoxEvent(
                    seq = 97,
                    timestampUnixMs = 1771490111000,
                    uptimeMs = 22200,
                    type = "thermal_state",
                    thread = CircleBoxEventThread.BACKGROUND,
                    severity = CircleBoxEventSeverity.WARN,
                    attrs = mapOf("state" to "critical")
                ),
                CircleBoxEvent(
                    seq = 98,
                    timestampUnixMs = 1771490112000,
                    uptimeMs = 22300,
                    type = "native_exception_prehook",
                    thread = CircleBoxEventThread.CRASH,
                    severity = CircleBoxEventSeverity.FATAL,
                    attrs = mapOf("details" to "java.lang.RuntimeException: unit-test")
                )
            )
        )
    }
}
