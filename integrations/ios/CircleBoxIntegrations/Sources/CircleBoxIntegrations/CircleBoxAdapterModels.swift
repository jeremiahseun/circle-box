import Foundation

public struct CircleBoxAdapterEvent: Decodable {
    public let seq: Int64
    public let timestampUnixMs: Int64
    public let uptimeMs: Int64
    public let type: String
    public let thread: String
    public let severity: String
    public let attrs: [String: String]

    enum CodingKeys: String, CodingKey {
        case seq
        case timestampUnixMs = "timestamp_unix_ms"
        case uptimeMs = "uptime_ms"
        case type
        case thread
        case severity
        case attrs
    }
}

public struct CircleBoxAdapterEnvelope: Decodable {
    public let schemaVersion: Int
    public let sessionId: String
    public let platform: String
    public let appVersion: String
    public let buildNumber: String
    public let osVersion: String
    public let deviceModel: String
    public let exportSource: String
    public let captureReason: String
    public let generatedAtUnixMs: Int64
    public let events: [CircleBoxAdapterEvent]

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
}

public struct CircleBoxSentryBreadcrumb {
    public let category: String
    public let level: String
    public let message: String
    public let timestampUnixMs: Int64
    public let data: [String: String]
}

public struct CircleBoxPostHogEvent {
    public let event: String
    public let properties: [String: String]
}
