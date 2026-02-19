import XCTest
@testable import CircleBoxSDK

final class CircleBoxSerializerTests: XCTestCase {
    func testSummaryIncludesCountsAndCrashFlag() throws {
        let envelope = CircleBoxEnvelope(
            sessionId: "s1",
            platform: "ios",
            appVersion: "1.0",
            buildNumber: "1",
            osVersion: "17.0",
            deviceModel: "iPhone",
            generatedAtUnixMs: 2000,
            events: [
                CircleBoxEvent(
                    seq: 0,
                    timestampUnixMs: 1000,
                    uptimeMs: 10,
                    type: "breadcrumb",
                    thread: .main,
                    severity: .info,
                    attrs: ["message": "start"]
                ),
                CircleBoxEvent(
                    seq: 1,
                    timestampUnixMs: 1500,
                    uptimeMs: 15,
                    type: "native_exception_prehook",
                    thread: .crash,
                    severity: .fatal,
                    attrs: ["details": "boom"]
                )
            ]
        )

        let data = try CircleBoxSerializer.summaryData(from: envelope, exportSource: "pending_crash")
        let jsonObject = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])

        XCTAssertEqual(jsonObject["export_source"] as? String, "pending_crash")
        XCTAssertEqual(jsonObject["capture_reason"] as? String, "manual_export")
        XCTAssertEqual(jsonObject["schema_version"] as? Int, 2)
        XCTAssertEqual(jsonObject["total_events"] as? Int, 2)
        XCTAssertEqual(jsonObject["crash_event_present"] as? Bool, true)

        let typeCounts = try XCTUnwrap(jsonObject["event_type_counts"] as? [String: Any])
        XCTAssertEqual((typeCounts["breadcrumb"] as? NSNumber)?.intValue, 1)
        XCTAssertEqual((typeCounts["native_exception_prehook"] as? NSNumber)?.intValue, 1)

        let lastEvents = try XCTUnwrap(jsonObject["last_events"] as? [[String: Any]])
        XCTAssertEqual(lastEvents.count, 2)
    }

    func testGzipDataUsesGzipHeader() throws {
        let data = Data(String(repeating: "circlebox,", count: 32).utf8)
        let compressed = try CircleBoxSerializer.gzipData(data)

        XCTAssertGreaterThan(compressed.count, 2)
        XCTAssertEqual(compressed[0], 0x1f)
        XCTAssertEqual(compressed[1], 0x8b)
        XCTAssertLessThan(compressed.count, data.count)
    }

    func testCsvIncludesMetadataHeader() {
        let envelope = CircleBoxEnvelope(
            sessionId: "s1",
            platform: "ios",
            appVersion: "1.0",
            buildNumber: "1",
            osVersion: "17.0",
            deviceModel: "iPhone",
            exportSource: .pendingCrash,
            captureReason: .uncaughtException,
            generatedAtUnixMs: 2000,
            events: []
        )

        let csv = String(data: CircleBoxSerializer.csvData(from: envelope), encoding: .utf8)
        XCTAssertNotNil(csv)
        XCTAssertTrue(csv?.contains("meta,schema_version,export_source,capture_reason") == true)
        XCTAssertTrue(csv?.contains("pending_crash") == true)
        XCTAssertTrue(csv?.contains("uncaught_exception") == true)
    }

    func testEnvelopeEncodingUsesSnakeCaseKeys() throws {
        let envelope = CircleBoxEnvelope(
            sessionId: "s1",
            platform: "ios",
            appVersion: "1.0",
            buildNumber: "1",
            osVersion: "17.0",
            deviceModel: "iPhone",
            generatedAtUnixMs: 2000,
            events: []
        )

        let data = try CircleBoxSerializer.jsonData(from: envelope)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])

        XCTAssertEqual(object["schema_version"] as? Int, 2)
        XCTAssertEqual(object["session_id"] as? String, "s1")
        XCTAssertEqual(object["export_source"] as? String, "live_snapshot")
        XCTAssertEqual(object["capture_reason"] as? String, "manual_export")
    }

    func testEnvelopeDecodingSupportsLegacyCamelCaseKeys() throws {
        let legacy = """
        {
          "schemaVersion": 1,
          "sessionId": "legacy",
          "platform": "ios",
          "appVersion": "1.0",
          "buildNumber": "1",
          "osVersion": "17.0",
          "deviceModel": "iPhone",
          "generatedAtUnixMs": 1000,
          "events": [
            {
              "seq": 1,
              "timestampUnixMs": 1000,
              "uptimeMs": 200,
              "type": "breadcrumb",
              "thread": "main",
              "severity": "info",
              "attrs": {"message":"legacy"}
            }
          ]
        }
        """
        let data = Data(legacy.utf8)
        let envelope = try CircleBoxSerializer.decodeEnvelope(from: data)

        XCTAssertEqual(envelope.sessionId, "legacy")
        XCTAssertEqual(envelope.schemaVersion, 1)
        XCTAssertEqual(envelope.events.first?.timestampUnixMs, 1000)
    }
}
