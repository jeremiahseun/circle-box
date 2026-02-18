import Foundation

/// Sanitizes event attributes before they enter the in-memory ring buffer.
enum CircleBoxSanitizer {
    // Operational telemetry keys that are safe to keep for debugging.
    private static let safeTelemetryKeys: Set<String> = [
        "available_bytes",
        "blocked_ms",
        "threshold_ms",
        "buffer_capacity",
        "disk_check_interval_sec",
        "signal_number",
        "uptime_ms",
        "timestamp_unix_ms"
    ]

    private static let emailRegex = try! NSRegularExpression(
        pattern: "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}",
        options: [.caseInsensitive]
    )

    private static let phoneRegex = try! NSRegularExpression(
        pattern: "\\+?[0-9][0-9\\-() ]{7,}[0-9]",
        options: []
    )

    private static let cardRegex = try! NSRegularExpression(
        pattern: "\\b(?:\\d[ -]*?){13,19}\\b",
        options: []
    )

    static func sanitize(attrs: [String: String], config: CircleBoxConfig) -> [String: String] {
        guard !attrs.isEmpty else { return attrs }

        var sanitized: [String: String] = [:]
        sanitized.reserveCapacity(attrs.count)

        for (key, value) in attrs {
            var output = value
            if output.count > config.maxAttributeLength {
                output = String(output.prefix(config.maxAttributeLength))
            }

            if config.sanitizeAttributes && shouldRedact(key: key, value: output) {
                // Redact matched sensitive patterns instead of partially masking.
                output = "[REDACTED]"
            }

            sanitized[key] = output
        }

        return sanitized
    }

    private static func shouldRedact(key: String, value: String) -> Bool {
        if safeTelemetryKeys.contains(key.lowercased()) {
            return false
        }

        let range = NSRange(location: 0, length: value.utf16.count)
        return emailRegex.firstMatch(in: value, options: [], range: range) != nil
            || phoneRegex.firstMatch(in: value, options: [], range: range) != nil
            || cardRegex.firstMatch(in: value, options: [], range: range) != nil
    }
}
