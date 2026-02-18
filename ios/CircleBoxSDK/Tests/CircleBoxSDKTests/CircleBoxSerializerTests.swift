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
}
