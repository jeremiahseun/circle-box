/// Debug-view event model returned by native `debugSnapshot` APIs.
class CircleBoxDebugEvent {
  const CircleBoxDebugEvent({
    required this.seq,
    required this.timestampUnixMs,
    required this.uptimeMs,
    required this.type,
    required this.thread,
    required this.severity,
    required this.attrs,
  });

  final int seq;
  final int timestampUnixMs;
  final int uptimeMs;
  final String type;
  final String thread;
  final String severity;
  final Map<String, String> attrs;

  factory CircleBoxDebugEvent.fromMap(Map<Object?, Object?> raw) {
    final attrsRaw = raw['attrs'] as Map<Object?, Object?>? ?? const {};
    final attrs = <String, String>{};
    for (final entry in attrsRaw.entries) {
      attrs[entry.key.toString()] = entry.value?.toString() ?? '';
    }

    return CircleBoxDebugEvent(
      seq: (raw['seq'] as num?)?.toInt() ?? 0,
      timestampUnixMs: (raw['timestamp_unix_ms'] as num?)?.toInt() ?? 0,
      uptimeMs: (raw['uptime_ms'] as num?)?.toInt() ?? 0,
      type: raw['type']?.toString() ?? '',
      thread: raw['thread']?.toString() ?? '',
      severity: raw['severity']?.toString() ?? '',
      attrs: attrs,
    );
  }
}
