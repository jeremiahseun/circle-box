import XCTest
@testable import CircleBoxCloud

final class CircleBoxCloudTests: XCTestCase {
    func testConfigClampsValues() {
        let config = CircleBoxCloudConfig(
            endpoint: URL(string: "https://api.circlebox.dev")!,
            ingestKey: "cb_live_test",
            flushIntervalSec: 1,
            maxQueueMB: 0,
            retryMaxBackoffSec: 1
        )

        XCTAssertEqual(config.flushIntervalSec, 10)
        XCTAssertEqual(config.maxQueueMB, 1)
        XCTAssertEqual(config.retryMaxBackoffSec, 30)
        XCTAssertTrue(config.enableAutoFlush)
        XCTAssertTrue(config.autoExportPendingOnStart)
        XCTAssertFalse(config.enableUsageBeacon)
        XCTAssertNil(config.usageBeaconKey)
        XCTAssertEqual(config.usageBeaconMode, .coreCloud)
        XCTAssertEqual(config.usageBeaconMinIntervalSec, 300)
    }
}
