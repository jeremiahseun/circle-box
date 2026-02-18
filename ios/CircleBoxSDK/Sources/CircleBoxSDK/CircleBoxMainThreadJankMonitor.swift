import Foundation

final class CircleBoxMainThreadJankMonitor {
    private let thresholdMs: UInt64
    private let onJank: (UInt64) -> Void
    private let queue = DispatchQueue(label: "com.circlebox.sdk.jank")
    private var timer: DispatchSourceTimer?
    private var lastMainPingAckMs: UInt64 = CircleBoxMainThreadJankMonitor.nowMs()
    private var lastReportMs: UInt64 = 0

    init(thresholdMs: UInt64, onJank: @escaping (UInt64) -> Void) {
        self.thresholdMs = thresholdMs
        self.onJank = onJank
    }

    func start() {
        stop()
        let timer = DispatchSource.makeTimerSource(queue: queue)
        timer.schedule(deadline: .now() + .milliseconds(50), repeating: .milliseconds(50))
        timer.setEventHandler { [weak self] in
            self?.tick()
        }
        self.timer = timer
        timer.resume()
    }

    func stop() {
        timer?.setEventHandler {}
        timer?.cancel()
        timer = nil
    }

    private func tick() {
        DispatchQueue.main.async { [weak self] in
            self?.lastMainPingAckMs = Self.nowMs()
        }

        let now = Self.nowMs()
        let lag = now > lastMainPingAckMs ? now - lastMainPingAckMs : 0
        if lag > thresholdMs && (now - lastReportMs) > thresholdMs {
            lastReportMs = now
            onJank(lag)
        }
    }

    private static func nowMs() -> UInt64 {
        UInt64(Date().timeIntervalSince1970 * 1000)
    }
}
