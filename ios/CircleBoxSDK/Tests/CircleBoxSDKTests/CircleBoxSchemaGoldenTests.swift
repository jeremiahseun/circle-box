import XCTest
@testable import CircleBoxSDK

final class CircleBoxSchemaGoldenTests: XCTestCase {
    func testIOSLiveSnapshotMatchesGoldenFixture() throws {
        let envelope = makeIOSLiveSnapshotEnvelope()
        try assertEnvelope(envelope, matchesFixture: "ios-live-snapshot.json")
    }

    func testIOSPendingCrashMatchesGoldenFixture() throws {
        let envelope = makeIOSPendingCrashEnvelope()
        try assertEnvelope(envelope, matchesFixture: "ios-pending-crash.json")
    }

    private func assertEnvelope(_ envelope: CircleBoxEnvelope, matchesFixture fixtureName: String) throws {
        let generated = try CircleBoxSerializer.jsonData(from: envelope)
        let fixture = try Data(contentsOf: fixtureURL(named: fixtureName))

        XCTAssertEqual(
            try canonicalJSONString(from: generated),
            try canonicalJSONString(from: fixture),
            "Generated envelope does not match fixture \(fixtureName)"
        )
    }

    private func fixtureURL(named name: String) -> URL {
        URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
            .appendingPathComponent("../../docs/fixtures/schema-v2", isDirectory: true)
            .appendingPathComponent(name)
            .standardizedFileURL
    }

    private func canonicalJSONString(from data: Data) throws -> String {
        let object = try JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
        let normalized = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
        return String(decoding: normalized, as: UTF8.self)
    }

    private func makeIOSLiveSnapshotEnvelope() -> CircleBoxEnvelope {
        CircleBoxEnvelope(
            schemaVersion: 2,
            sessionId: "IOS-SAMPLE-SESSION",
            platform: "ios",
            appVersion: "1.0",
            buildNumber: "1",
            osVersion: "17.0",
            deviceModel: "iPhone",
            exportSource: .liveSnapshot,
            captureReason: .manualExport,
            generatedAtUnixMs: 1771490003000,
            events: [
                CircleBoxEvent(
                    seq: 0,
                    timestampUnixMs: 1771490001000,
                    uptimeMs: 100,
                    type: "sdk_start",
                    thread: .main,
                    severity: .info,
                    attrs: ["buffer_capacity": "200"]
                ),
                CircleBoxEvent(
                    seq: 1,
                    timestampUnixMs: 1771490002000,
                    uptimeMs: 200,
                    type: "breadcrumb",
                    thread: .main,
                    severity: .info,
                    attrs: [
                        "flow": "checkout",
                        "message": "User started Checkout"
                    ]
                )
            ]
        )
    }

    private func makeIOSPendingCrashEnvelope() -> CircleBoxEnvelope {
        CircleBoxEnvelope(
            schemaVersion: 2,
            sessionId: "IOS-PENDING-SESSION",
            platform: "ios",
            appVersion: "1.0",
            buildNumber: "1",
            osVersion: "17.0",
            deviceModel: "iPhone",
            exportSource: .pendingCrash,
            captureReason: .uncaughtException,
            generatedAtUnixMs: 1771490113000,
            events: [
                CircleBoxEvent(
                    seq: 97,
                    timestampUnixMs: 1771490111000,
                    uptimeMs: 22200,
                    type: "thermal_state",
                    thread: .background,
                    severity: .warn,
                    attrs: ["state": "critical"]
                ),
                CircleBoxEvent(
                    seq: 98,
                    timestampUnixMs: 1771490112000,
                    uptimeMs: 22300,
                    type: "native_exception_prehook",
                    thread: .crash,
                    severity: .fatal,
                    attrs: ["details": "NSInvalidArgumentException:unit-test"]
                )
            ]
        )
    }
}
