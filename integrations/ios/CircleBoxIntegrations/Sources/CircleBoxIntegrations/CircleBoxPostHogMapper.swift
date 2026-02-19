import Foundation

public enum CircleBoxPostHogMapper {
    public static func event(
        from envelope: CircleBoxAdapterEnvelope,
        name: String = "circlebox_context"
    ) -> CircleBoxPostHogEvent {
        var typeCounts: [String: Int] = [:]
        var severityCounts: [String: Int] = [:]
        for event in envelope.events {
            typeCounts[event.type, default: 0] += 1
            severityCounts[event.severity, default: 0] += 1
        }

        var properties: [String: String] = [
            "schema_version": String(envelope.schemaVersion),
            "session_id": envelope.sessionId,
            "platform": envelope.platform,
            "export_source": envelope.exportSource,
            "capture_reason": envelope.captureReason,
            "total_events": String(envelope.events.count)
        ]
        if let last = envelope.events.last {
            properties["last_event_type"] = last.type
            properties["last_event_severity"] = last.severity
        }
        properties["event_type_counts"] = compactJSON(typeCounts)
        properties["severity_counts"] = compactJSON(severityCounts)

        return CircleBoxPostHogEvent(event: name, properties: properties)
    }

    private static func compactJSON(_ object: [String: Int]) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]),
              let text = String(data: data, encoding: .utf8) else {
            return "{}"
        }
        return text
    }
}
