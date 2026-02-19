import XCTest
#if canImport(Darwin)
import Darwin
#endif
@testable import CircleBoxSDK

final class CircleBoxCrashRecoveryTests: XCTestCase {
    func testSignalMarkerRoundTrip() throws {
        let store = makeStore()
        let marker = CircleBoxSignalMarker(signal: SIGABRT, name: "SIGABRT", timestampUnixMs: 12345)

        try store.writeSignalMarker(marker)
        let recovered = try XCTUnwrap(store.readSignalMarker())

        XCTAssertEqual(recovered.signal, SIGABRT)
        XCTAssertEqual(recovered.name, "SIGABRT")
        XCTAssertEqual(recovered.timestampUnixMs, 12345)
    }

    func testCheckpointRoundTrip() throws {
        let store = makeStore()
        let checkpoint = makeEnvelope(events: [
            CircleBoxEvent(
                seq: 1,
                timestampUnixMs: 11,
                uptimeMs: 22,
                type: "breadcrumb",
                thread: .main,
                severity: .info,
                attrs: ["message": "hello"]
            )
        ])

        try store.writeCheckpointEnvelope(checkpoint)
        let recovered = try XCTUnwrap(store.readCheckpointEnvelope())

        XCTAssertEqual(recovered.sessionId, checkpoint.sessionId)
        XCTAssertEqual(recovered.events.count, 1)
        XCTAssertEqual(recovered.events.first?.type, "breadcrumb")
    }

    func testRecoverPendingFromSignalMarkerUsesCheckpointAndAppendsCrashEvent() throws {
        let store = makeStore()
        let checkpoint = makeEnvelope(events: [
            CircleBoxEvent(
                seq: 7,
                timestampUnixMs: 100,
                uptimeMs: 120,
                type: "breadcrumb",
                thread: .main,
                severity: .info,
                attrs: ["message": "before crash"]
            )
        ])
        try store.writeCheckpointEnvelope(checkpoint)
        try store.writeSignalMarker(CircleBoxSignalMarker(signal: SIGABRT, name: "SIGABRT", timestampUnixMs: 777))

        let runtime = CircleBoxRuntime(
            fileStore: store,
            environmentProvider: {
                CircleBoxEnvironment(
                    sessionID: "test-session",
                    platform: "ios",
                    appVersion: "1.0",
                    buildNumber: "1",
                    osVersion: "17.0",
                    deviceModel: "iPhone"
                )
            }
        )

        runtime.recoverPendingFromSignalMarkerIfNeeded()

        XCTAssertTrue(store.hasPendingCrashReport())
        XCTAssertNil(store.readSignalMarker())
        XCTAssertNil(store.readCheckpointEnvelope())

        let pending = try XCTUnwrap(store.readPendingEnvelope())
        XCTAssertEqual(pending.events.count, 2)
        XCTAssertEqual(pending.exportSource, .pendingCrash)
        XCTAssertEqual(pending.captureReason, .startupPendingDetection)

        let crash = try XCTUnwrap(pending.events.last)
        XCTAssertEqual(crash.seq, 8)
        XCTAssertEqual(crash.type, "native_exception_prehook")
        XCTAssertEqual(crash.thread, .crash)
        XCTAssertEqual(crash.severity, .fatal)
        XCTAssertEqual(crash.attrs["signal"], "SIGABRT")
        XCTAssertEqual(crash.attrs["signal_number"], String(SIGABRT))
        XCTAssertEqual(crash.timestampUnixMs, 777)
    }

    func testRecoverPendingClearsSignalMarkerWhenPendingAlreadyExists() throws {
        let store = makeStore()
        let pending = makeEnvelope(events: [])
        try store.writePendingEnvelope(pending)
        try store.writeSignalMarker(CircleBoxSignalMarker(signal: SIGSEGV, name: "SIGSEGV", timestampUnixMs: 1))

        let runtime = CircleBoxRuntime(fileStore: store)
        runtime.recoverPendingFromSignalMarkerIfNeeded()

        XCTAssertTrue(store.hasPendingCrashReport())
        XCTAssertNil(store.readSignalMarker())
    }

    func testProtobufPersistenceDecodesLegacyJsonEnvelope() throws {
        let envelope = makeEnvelope(events: [])
        let legacyJson = try CircleBoxSerializer.jsonData(from: envelope)

        let decoded = CircleBoxProtobufPersistence.decodeEnvelope(legacyJson)
        XCTAssertEqual(decoded?.sessionId, envelope.sessionId)
        XCTAssertEqual(decoded?.schemaVersion, envelope.schemaVersion)
    }

    private func makeStore() -> CircleBoxFileStore {
        CircleBoxFileStore(namespace: "CircleBoxTests-\(UUID().uuidString)")
    }

    private func makeEnvelope(events: [CircleBoxEvent]) -> CircleBoxEnvelope {
        CircleBoxEnvelope(
            sessionId: "session",
            platform: "ios",
            appVersion: "1.0",
            buildNumber: "1",
            osVersion: "17.0",
            deviceModel: "iPhone",
            generatedAtUnixMs: 500,
            events: events
        )
    }
}
