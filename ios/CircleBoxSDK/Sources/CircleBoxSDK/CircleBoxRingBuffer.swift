import Foundation

/// Fixed-capacity, thread-safe circular buffer.
///
/// When full, appending a new element overwrites the oldest element.
final class CircleBoxRingBuffer<Element> {
    private let queue = DispatchQueue(label: "com.circlebox.sdk.ringbuffer")
    private var storage: [Element?]
    private var writeIndex: Int = 0
    private var storedCount: Int = 0
    private var sequence: Int64 = 0

    init(capacity: Int) {
        precondition(capacity > 0)
        self.storage = Array(repeating: nil, count: capacity)
    }

    var capacity: Int {
        storage.count
    }

    var count: Int {
        queue.sync { storedCount }
    }

    func append(_ build: (Int64) -> Element) {
        queue.sync {
            let next = sequence
            sequence += 1
            storage[writeIndex] = build(next)
            writeIndex = (writeIndex + 1) % storage.count
            storedCount = min(storedCount + 1, storage.count)
        }
    }

    func snapshot() -> [Element] {
        queue.sync {
            guard storedCount > 0 else { return [] }
            var result: [Element] = []
            result.reserveCapacity(storedCount)
            // Once the buffer reaches capacity, writeIndex always points to the oldest item.
            let start = storedCount == storage.count ? writeIndex : 0
            for offset in 0..<storedCount {
                let index = (start + offset) % storage.count
                if let value = storage[index] {
                    result.append(value)
                }
            }
            return result
        }
    }

    func clear() {
        queue.sync {
            storage = Array(repeating: nil, count: storage.count)
            writeIndex = 0
            storedCount = 0
        }
    }
}
