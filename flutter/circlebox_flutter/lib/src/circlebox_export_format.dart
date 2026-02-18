/// Export formats supported by [CircleBox.exportLogs].
enum CircleBoxExportFormat {
  json,
  csv,
}

extension CircleBoxExportFormatWire on CircleBoxExportFormat {
  /// Platform wire-format string for this enum value.
  String get wireName {
    switch (this) {
      case CircleBoxExportFormat.json:
        return 'json';
      case CircleBoxExportFormat.csv:
        return 'csv';
    }
  }
}
