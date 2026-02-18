/// Export formats supported by [CircleBox.exportLogs].
enum CircleBoxExportFormat {
  json,
  csv,
  jsonGzip,
  csvGzip,
  summary,
}

extension CircleBoxExportFormatWire on CircleBoxExportFormat {
  /// Platform wire-format string for this enum value.
  String get wireName {
    switch (this) {
      case CircleBoxExportFormat.json:
        return 'json';
      case CircleBoxExportFormat.csv:
        return 'csv';
      case CircleBoxExportFormat.jsonGzip:
        return 'json_gzip';
      case CircleBoxExportFormat.csvGzip:
        return 'csv_gzip';
      case CircleBoxExportFormat.summary:
        return 'summary';
    }
  }
}
