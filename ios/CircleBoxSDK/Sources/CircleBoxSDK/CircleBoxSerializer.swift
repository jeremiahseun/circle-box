import Foundation

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
        var lines: [String] = ["seq,timestamp_unix_ms,uptime_ms,type,thread,severity,attrs_json"]
        lines.reserveCapacity(envelope.events.count + 1)

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

    private static func csvEscape(_ value: String) -> String {
        let escaped = value.replacingOccurrences(of: "\"", with: "\"\"")
        if escaped.contains(",") || escaped.contains("\n") || escaped.contains("\"") {
            return "\"\(escaped)\""
        }
        return escaped
    }
}
