import XCTest
@testable import CircleBoxSDK

final class CircleBoxRingBufferTests: XCTestCase {
    func testBufferHoldsFortyNineEvents() {
        let buffer = CircleBoxRingBuffer<Int64>(capacity: 50)
        for _ in 0..<49 {
            buffer.append { $0 }
        }
        XCTAssertEqual(buffer.count, 49)
        XCTAssertEqual(buffer.snapshot().first, 0)
        XCTAssertEqual(buffer.snapshot().last, 48)
    }

    func testBufferHoldsFiftyEvents() {
        let buffer = CircleBoxRingBuffer<Int64>(capacity: 50)
        for _ in 0..<50 {
            buffer.append { $0 }
        }

        let snapshot = buffer.snapshot()
        XCTAssertEqual(snapshot.count, 50)
        XCTAssertEqual(snapshot.first, 0)
        XCTAssertEqual(snapshot.last, 49)
    }

    func testFiftyFirstEventOverwritesOldest() {
        let buffer = CircleBoxRingBuffer<Int64>(capacity: 50)
        for _ in 0..<51 {
            buffer.append { $0 }
        }

        let snapshot = buffer.snapshot()
        XCTAssertEqual(snapshot.count, 50)
        XCTAssertEqual(snapshot.first, 1)
        XCTAssertEqual(snapshot.last, 50)
    }

    func testFiveHundredEventsKeepMostRecentFifty() {
        let buffer = CircleBoxRingBuffer<Int64>(capacity: 50)
        for _ in 0..<500 {
            buffer.append { $0 }
        }

        let snapshot = buffer.snapshot()
        XCTAssertEqual(snapshot.count, 50)
        XCTAssertEqual(snapshot.first, 450)
        XCTAssertEqual(snapshot.last, 499)
    }

    func testConcurrentAppendsRemainOrdered() {
        let buffer = CircleBoxRingBuffer<Int64>(capacity: 50)
        let group = DispatchGroup()

        for _ in 0..<1000 {
            group.enter()
            DispatchQueue.global().async {
                buffer.append { $0 }
                group.leave()
            }
        }

        group.wait()
        let snapshot = buffer.snapshot()

        XCTAssertEqual(snapshot.count, 50)
        XCTAssertEqual(snapshot, snapshot.sorted())
    }
}
