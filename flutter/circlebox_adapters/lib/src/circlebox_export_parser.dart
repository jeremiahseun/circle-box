import 'dart:convert';
import 'dart:io';

import 'circlebox_adapter_models.dart';

class CircleBoxExportParser {
  static Future<CircleBoxAdapterEnvelope?> parsePath(String path) async {
    final file = File(path);
    if (!await file.exists()) {
      return null;
    }

    List<int> bytes = await file.readAsBytes();
    if (path.endsWith('.gz')) {
      bytes = gzip.decode(bytes);
    }

    if (path.endsWith('.csv') || path.endsWith('.csv.gz')) {
      return _parseCsv(utf8.decode(bytes));
    }
    return _parseJsonMap(jsonDecode(utf8.decode(bytes)) as Object?);
  }

  static CircleBoxAdapterEnvelope? _parseJsonMap(Object? raw) {
    if (raw is! Map<String, dynamic>) {
      return null;
    }

    // Full envelope JSON.
    if (raw.containsKey('events')) {
      final eventsRaw = raw['events'] as List<dynamic>? ?? const [];
      return CircleBoxAdapterEnvelope(
        schemaVersion: (raw['schema_version'] as num?)?.toInt() ?? 2,
        sessionId: raw['session_id']?.toString() ?? '',
        platform: raw['platform']?.toString() ?? '',
        appVersion: raw['app_version']?.toString() ?? '',
        buildNumber: raw['build_number']?.toString() ?? '',
        osVersion: raw['os_version']?.toString() ?? '',
        deviceModel: raw['device_model']?.toString() ?? '',
        exportSource: raw['export_source']?.toString() ?? 'live_snapshot',
        captureReason: raw['capture_reason']?.toString() ?? 'manual_export',
        generatedAtUnixMs: (raw['generated_at_unix_ms'] as num?)?.toInt() ?? 0,
        events: eventsRaw.map(_eventFromJson).whereType<CircleBoxAdapterEvent>().toList(growable: false),
      );
    }

    // Summary JSON fallback.
    final recent = raw['last_events'] as List<dynamic>? ?? const [];
    return CircleBoxAdapterEnvelope(
      schemaVersion: (raw['schema_version'] as num?)?.toInt() ?? 2,
      sessionId: raw['session_id']?.toString() ?? '',
      platform: raw['platform']?.toString() ?? '',
      appVersion: raw['app_version']?.toString() ?? '',
      buildNumber: raw['build_number']?.toString() ?? '',
      osVersion: raw['os_version']?.toString() ?? '',
      deviceModel: raw['device_model']?.toString() ?? '',
      exportSource: raw['export_source']?.toString() ?? 'live_snapshot',
      captureReason: raw['capture_reason']?.toString() ?? 'manual_export',
      generatedAtUnixMs: (raw['generated_at_unix_ms'] as num?)?.toInt() ?? 0,
      events: recent.map(_eventFromJson).whereType<CircleBoxAdapterEvent>().toList(growable: false),
    );
  }

  static CircleBoxAdapterEvent? _eventFromJson(Object? raw) {
    if (raw is! Map<String, dynamic>) {
      return null;
    }
    final attrsRaw = raw['attrs'] as Map<String, dynamic>? ?? const {};
    final attrs = <String, String>{};
    for (final entry in attrsRaw.entries) {
      attrs[entry.key] = entry.value.toString();
    }

    return CircleBoxAdapterEvent(
      seq: (raw['seq'] as num?)?.toInt() ?? 0,
      timestampUnixMs: (raw['timestamp_unix_ms'] as num?)?.toInt() ?? 0,
      uptimeMs: (raw['uptime_ms'] as num?)?.toInt() ?? 0,
      type: raw['type']?.toString() ?? '',
      thread: raw['thread']?.toString() ?? '',
      severity: raw['severity']?.toString() ?? '',
      attrs: attrs,
    );
  }

  static CircleBoxAdapterEnvelope? _parseCsv(String csv) {
    final lines = csv
        .split('\n')
        .map((line) => line.trimRight())
        .where((line) => line.isNotEmpty)
        .toList(growable: false);
    if (lines.isEmpty) {
      return null;
    }

    String exportSource = 'live_snapshot';
    String captureReason = 'manual_export';
    int schemaVersion = 2;
    String sessionId = '';
    String platform = '';
    int generatedAt = 0;

    var eventHeaderIndex = 0;
    if (lines.first.startsWith('meta,')) {
      final meta = lines.length > 1 ? _parseCsvRow(lines[1]) : const <String>[];
      if (meta.length >= 7) {
        schemaVersion = int.tryParse(meta[1]) ?? 2;
        exportSource = meta[2];
        captureReason = meta[3];
        sessionId = meta[4];
        platform = meta[5];
        generatedAt = int.tryParse(meta[6]) ?? 0;
      }
      eventHeaderIndex = 2;
    }

    if (eventHeaderIndex >= lines.length || !lines[eventHeaderIndex].startsWith('seq,')) {
      return null;
    }

    final events = <CircleBoxAdapterEvent>[];
    for (var i = eventHeaderIndex + 1; i < lines.length; i++) {
      final columns = _parseCsvRow(lines[i]);
      if (columns.length < 7) {
        continue;
      }
      final attrs = <String, String>{};
      final attrsRaw = jsonDecode(columns[6]) as Map<String, dynamic>;
      for (final entry in attrsRaw.entries) {
        attrs[entry.key] = entry.value.toString();
      }
      events.add(
        CircleBoxAdapterEvent(
          seq: int.tryParse(columns[0]) ?? 0,
          timestampUnixMs: int.tryParse(columns[1]) ?? 0,
          uptimeMs: int.tryParse(columns[2]) ?? 0,
          type: columns[3],
          thread: columns[4],
          severity: columns[5],
          attrs: attrs,
        ),
      );
    }

    return CircleBoxAdapterEnvelope(
      schemaVersion: schemaVersion,
      sessionId: sessionId,
      platform: platform,
      appVersion: '',
      buildNumber: '',
      osVersion: '',
      deviceModel: '',
      exportSource: exportSource,
      captureReason: captureReason,
      generatedAtUnixMs: generatedAt,
      events: events,
    );
  }

  static List<String> _parseCsvRow(String row) {
    final values = <String>[];
    final buffer = StringBuffer();
    var quoted = false;

    for (var i = 0; i < row.length; i++) {
      final char = row[i];
      if (char == '"') {
        if (quoted && i + 1 < row.length && row[i + 1] == '"') {
          buffer.write('"');
          i += 1;
        } else {
          quoted = !quoted;
        }
        continue;
      }

      if (char == ',' && !quoted) {
        values.add(buffer.toString());
        buffer.clear();
        continue;
      }

      buffer.write(char);
    }
    values.add(buffer.toString());
    return values;
  }
}
