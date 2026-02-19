import Foundation

private struct CircleBoxSummaryEvent: Encodable {
    let seq: Int64
    let timestampUnixMs: Int64
    let type: String
    let thread: String
    let severity: String
    let attrs: [String: String]

    init(event: CircleBoxEvent) {
        self.seq = event.seq
        self.timestampUnixMs = event.timestampUnixMs
        self.type = event.type
        self.thread = event.thread.rawValue
        self.severity = event.severity.rawValue
        self.attrs = event.attrs
    }

    enum CodingKeys: String, CodingKey {
        case seq
        case timestampUnixMs = "timestamp_unix_ms"
        case type
        case thread
        case severity
        case attrs
    }
}

private struct CircleBoxSummary: Encodable {
    let schemaVersion: Int
    let generatedAtUnixMs: Int64
    let exportSource: String
    let captureReason: String
    let sessionId: String
    let platform: String
    let appVersion: String
    let buildNumber: String
    let osVersion: String
    let deviceModel: String
    let totalEvents: Int
    let firstEventUnixMs: Int64?
    let lastEventUnixMs: Int64?
    let durationMs: Int64?
    let crashEventPresent: Bool
    let eventTypeCounts: [String: Int]
    let severityCounts: [String: Int]
    let threadCounts: [String: Int]
    let lastEvents: [CircleBoxSummaryEvent]

    enum CodingKeys: String, CodingKey {
        case schemaVersion = "schema_version"
        case generatedAtUnixMs = "generated_at_unix_ms"
        case exportSource = "export_source"
        case captureReason = "capture_reason"
        case sessionId = "session_id"
        case platform
        case appVersion = "app_version"
        case buildNumber = "build_number"
        case osVersion = "os_version"
        case deviceModel = "device_model"
        case totalEvents = "total_events"
        case firstEventUnixMs = "first_event_unix_ms"
        case lastEventUnixMs = "last_event_unix_ms"
        case durationMs = "duration_ms"
        case crashEventPresent = "crash_event_present"
        case eventTypeCounts = "event_type_counts"
        case severityCounts = "severity_counts"
        case threadCounts = "thread_counts"
        case lastEvents = "last_events"
    }
}

enum CircleBoxSerializer {
    static func jsonData(from envelope: CircleBoxEnvelope) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(envelope)
    }

    static func decodeEnvelope(from data: Data) throws -> CircleBoxEnvelope {
        try JSONDecoder().decode(CircleBoxEnvelope.self, from: data)
    }

    static func csvData(from envelope: CircleBoxEnvelope) -> Data {
        var lines: [String] = [
            "meta,schema_version,export_source,capture_reason,session_id,platform,generated_at_unix_ms",
            [
                "meta",
                String(envelope.schemaVersion),
                csvEscape(envelope.exportSource.rawValue),
                csvEscape(envelope.captureReason.rawValue),
                csvEscape(envelope.sessionId),
                csvEscape(envelope.platform),
                String(envelope.generatedAtUnixMs)
            ].joined(separator: ","),
            "seq,timestamp_unix_ms,uptime_ms,type,thread,severity,attrs_json"
        ]
        lines.reserveCapacity(envelope.events.count + 3)

        let attrsEncoder = JSONEncoder()

        for event in envelope.events {
            let attrsData = (try? attrsEncoder.encode(event.attrs)) ?? Data("{}".utf8)
            let attrsJson = String(data: attrsData, encoding: .utf8) ?? "{}"
            lines.append([
                String(event.seq),
                String(event.timestampUnixMs),
                String(event.uptimeMs),
                csvEscape(event.type),
                csvEscape(event.thread.rawValue),
                csvEscape(event.severity.rawValue),
                csvEscape(attrsJson)
            ].joined(separator: ","))
        }

        return Data(lines.joined(separator: "\n").utf8)
    }

    static func gzipData(_ data: Data) throws -> Data {
        try CircleBoxCompression.gzip(data)
    }

    static func summaryData(
        from envelope: CircleBoxEnvelope,
        exportSource: String,
        maxRecentEvents: Int = 10
    ) throws -> Data {
        var eventTypeCounts: [String: Int] = [:]
        var severityCounts: [String: Int] = [:]
        var threadCounts: [String: Int] = [:]

        for event in envelope.events {
            eventTypeCounts[event.type, default: 0] += 1
            severityCounts[event.severity.rawValue, default: 0] += 1
            threadCounts[event.thread.rawValue, default: 0] += 1
        }

        let firstTimestamp = envelope.events.first?.timestampUnixMs
        let lastTimestamp = envelope.events.last?.timestampUnixMs
        let duration = (firstTimestamp != nil && lastTimestamp != nil) ? (lastTimestamp! - firstTimestamp!) : nil
        let hasCrashEvent = envelope.events.contains { $0.type == "native_exception_prehook" || $0.severity == .fatal }

        let recentCount = max(0, maxRecentEvents)
        let recentEvents = envelope.events.suffix(recentCount).map(CircleBoxSummaryEvent.init(event:))

        let summary = CircleBoxSummary(
            schemaVersion: envelope.schemaVersion,
            generatedAtUnixMs: envelope.generatedAtUnixMs,
            exportSource: exportSource,
            captureReason: envelope.captureReason.rawValue,
            sessionId: envelope.sessionId,
            platform: envelope.platform,
            appVersion: envelope.appVersion,
            buildNumber: envelope.buildNumber,
            osVersion: envelope.osVersion,
            deviceModel: envelope.deviceModel,
            totalEvents: envelope.events.count,
            firstEventUnixMs: firstTimestamp,
            lastEventUnixMs: lastTimestamp,
            durationMs: duration,
            crashEventPresent: hasCrashEvent,
            eventTypeCounts: eventTypeCounts,
            severityCounts: severityCounts,
            threadCounts: threadCounts,
            lastEvents: recentEvents
        )

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(summary)
    }

    private static func csvEscape(_ value: String) -> String {
        let escaped = value.replacingOccurrences(of: "\"", with: "\"\"")
        if escaped.contains(",") || escaped.contains("\n") || escaped.contains("\"") {
            return "\"\(escaped)\""
        }
        return escaped
    }
}
