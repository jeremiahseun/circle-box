import Foundation

/// Thread that emitted the event.
public enum CircleBoxEventThread: String, Codable, Sendable {
    case main
    case background
    case crash
}

/// Severity level for an event.
public enum CircleBoxEventSeverity: String, Codable, Sendable {
    case info
    case warn
    case error
    case fatal
}

/// Single ring-buffer entry.
public struct CircleBoxEvent: Codable, Sendable {
    /// Monotonic sequence number assigned in insertion order.
    public let seq: Int64
    /// Wall-clock time in Unix milliseconds.
    public let timestampUnixMs: Int64
    /// Process uptime in milliseconds when the event was recorded.
    public let uptimeMs: Int64
    /// Event type name.
    public let type: String
    public let thread: CircleBoxEventThread
    public let severity: CircleBoxEventSeverity
    /// Free-form attributes (sanitized/truncated by config).
    public let attrs: [String: String]

    public init(
        seq: Int64,
        timestampUnixMs: Int64,
        uptimeMs: Int64,
        type: String,
        thread: CircleBoxEventThread,
        severity: CircleBoxEventSeverity,
        attrs: [String: String]
    ) {
        self.seq = seq
        self.timestampUnixMs = timestampUnixMs
        self.uptimeMs = uptimeMs
        self.type = type
        self.thread = thread
        self.severity = severity
        self.attrs = attrs
    }
}

/// Report envelope exported to JSON (and used as CSV input).
public struct CircleBoxEnvelope: Codable, Sendable {
    public let schemaVersion: Int
    public let sessionId: String
    public let platform: String
    public let appVersion: String
    public let buildNumber: String
    public let osVersion: String
    public let deviceModel: String
    public let generatedAtUnixMs: Int64
    public let events: [CircleBoxEvent]

    public init(
        schemaVersion: Int = 1,
        sessionId: String,
        platform: String,
        appVersion: String,
        buildNumber: String,
        osVersion: String,
        deviceModel: String,
        generatedAtUnixMs: Int64,
        events: [CircleBoxEvent]
    ) {
        self.schemaVersion = schemaVersion
        self.sessionId = sessionId
        self.platform = platform
        self.appVersion = appVersion
        self.buildNumber = buildNumber
        self.osVersion = osVersion
        self.deviceModel = deviceModel
        self.generatedAtUnixMs = generatedAtUnixMs
        self.events = events
    }
}
