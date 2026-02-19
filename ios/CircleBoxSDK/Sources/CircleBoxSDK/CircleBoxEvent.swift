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

/// Source category for an exported envelope.
public enum CircleBoxExportSource: String, Codable, Sendable {
    case pendingCrash = "pending_crash"
    case liveSnapshot = "live_snapshot"
}

/// Why this envelope was captured.
public enum CircleBoxCaptureReason: String, Codable, Sendable {
    case uncaughtException = "uncaught_exception"
    case manualExport = "manual_export"
    case startupPendingDetection = "startup_pending_detection"
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

    enum CodingKeys: String, CodingKey {
        case seq
        case timestampUnixMs = "timestamp_unix_ms"
        case uptimeMs = "uptime_ms"
        case type
        case thread
        case severity
        case attrs
    }

    enum LegacyCodingKeys: String, CodingKey {
        case seq
        case timestampUnixMs
        case uptimeMs
        case type
        case thread
        case severity
        case attrs
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let legacy = try decoder.container(keyedBy: LegacyCodingKeys.self)

        func decode<T: Decodable>(_ key: CodingKeys, legacy legacyKey: LegacyCodingKeys) throws -> T {
            if let value = try container.decodeIfPresent(T.self, forKey: key) {
                return value
            }
            return try legacy.decode(T.self, forKey: legacyKey)
        }

        seq = try decode(.seq, legacy: .seq)
        timestampUnixMs = try decode(.timestampUnixMs, legacy: .timestampUnixMs)
        uptimeMs = try decode(.uptimeMs, legacy: .uptimeMs)
        type = try decode(.type, legacy: .type)
        thread = try decode(.thread, legacy: .thread)
        severity = try decode(.severity, legacy: .severity)
        attrs = try decode(.attrs, legacy: .attrs)
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
    public let exportSource: CircleBoxExportSource
    public let captureReason: CircleBoxCaptureReason
    public let generatedAtUnixMs: Int64
    public let events: [CircleBoxEvent]

    public init(
        schemaVersion: Int = 2,
        sessionId: String,
        platform: String,
        appVersion: String,
        buildNumber: String,
        osVersion: String,
        deviceModel: String,
        exportSource: CircleBoxExportSource = .liveSnapshot,
        captureReason: CircleBoxCaptureReason = .manualExport,
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
        self.exportSource = exportSource
        self.captureReason = captureReason
        self.generatedAtUnixMs = generatedAtUnixMs
        self.events = events
    }

    enum CodingKeys: String, CodingKey {
        case schemaVersion = "schema_version"
        case sessionId = "session_id"
        case platform
        case appVersion = "app_version"
        case buildNumber = "build_number"
        case osVersion = "os_version"
        case deviceModel = "device_model"
        case exportSource = "export_source"
        case captureReason = "capture_reason"
        case generatedAtUnixMs = "generated_at_unix_ms"
        case events
    }

    enum LegacyCodingKeys: String, CodingKey {
        case schemaVersion
        case sessionId
        case platform
        case appVersion
        case buildNumber
        case osVersion
        case deviceModel
        case exportSource
        case captureReason
        case generatedAtUnixMs
        case events
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let legacy = try decoder.container(keyedBy: LegacyCodingKeys.self)

        func decode<T: Decodable>(_ key: CodingKeys, legacy legacyKey: LegacyCodingKeys) throws -> T {
            if let value = try container.decodeIfPresent(T.self, forKey: key) {
                return value
            }
            return try legacy.decode(T.self, forKey: legacyKey)
        }

        if let value = try container.decodeIfPresent(Int.self, forKey: .schemaVersion) {
            schemaVersion = value
        } else if let legacyValue = try legacy.decodeIfPresent(Int.self, forKey: .schemaVersion) {
            schemaVersion = legacyValue
        } else {
            schemaVersion = 1
        }
        sessionId = try decode(.sessionId, legacy: .sessionId)
        platform = try decode(.platform, legacy: .platform)
        appVersion = try decode(.appVersion, legacy: .appVersion)
        buildNumber = try decode(.buildNumber, legacy: .buildNumber)
        osVersion = try decode(.osVersion, legacy: .osVersion)
        deviceModel = try decode(.deviceModel, legacy: .deviceModel)
        if let value = try container.decodeIfPresent(CircleBoxExportSource.self, forKey: .exportSource) {
            exportSource = value
        } else if let legacyValue = try legacy.decodeIfPresent(CircleBoxExportSource.self, forKey: .exportSource) {
            exportSource = legacyValue
        } else {
            exportSource = .liveSnapshot
        }
        if let value = try container.decodeIfPresent(CircleBoxCaptureReason.self, forKey: .captureReason) {
            captureReason = value
        } else if let legacyValue = try legacy.decodeIfPresent(CircleBoxCaptureReason.self, forKey: .captureReason) {
            captureReason = legacyValue
        } else {
            captureReason = .manualExport
        }
        generatedAtUnixMs = try decode(.generatedAtUnixMs, legacy: .generatedAtUnixMs)
        events = try decode(.events, legacy: .events)
    }
}
