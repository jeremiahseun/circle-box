import Foundation

/// Runtime configuration for the CircleBox iOS SDK.
public struct CircleBoxConfig: Sendable {
    /// Maximum number of events kept in memory.
    public let bufferCapacity: Int
    /// Main-thread block threshold used to emit `thread_contention` events.
    public let jankThresholdMs: UInt64
    /// When enabled, event attributes are redacted for common PII patterns.
    public let sanitizeAttributes: Bool
    /// Maximum size for each attribute value before truncation.
    public let maxAttributeLength: Int
    /// Interval for disk-availability sampling events.
    public let diskCheckIntervalSec: TimeInterval
    /// Enables signal-based crash marker capture for hard crashes (e.g. SIGABRT/SIGSEGV).
    public let enableSignalCrashCapture: Bool

    /// Creates a CircleBox configuration.
    ///
    /// Values are clamped to safe minimums so invalid settings do not crash startup.
    public init(
        bufferCapacity: Int = 50,
        jankThresholdMs: UInt64 = 200,
        sanitizeAttributes: Bool = true,
        maxAttributeLength: Int = 256,
        diskCheckIntervalSec: TimeInterval = 60,
        enableSignalCrashCapture: Bool = true
    ) {
        self.bufferCapacity = max(1, bufferCapacity)
        self.jankThresholdMs = max(16, jankThresholdMs)
        self.sanitizeAttributes = sanitizeAttributes
        self.maxAttributeLength = max(16, maxAttributeLength)
        self.diskCheckIntervalSec = max(10, diskCheckIntervalSec)
        self.enableSignalCrashCapture = enableSignalCrashCapture
    }

    /// Production default configuration.
    public static let `default` = CircleBoxConfig()
}
