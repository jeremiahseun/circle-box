import Foundation

/// Export formats supported by `CircleBox.exportLogs`.
public enum CircleBoxExportFormat: String, Codable, CaseIterable, Hashable, Sendable {
    case json
    case csv
    case jsonGzip = "json_gzip"
    case csvGzip = "csv_gzip"
    case summary
}
