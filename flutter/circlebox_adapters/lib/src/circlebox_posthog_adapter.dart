import 'dart:async';

import 'circlebox_adapter_models.dart';

typedef CircleBoxPostHogCaptureSink = FutureOr<void> Function(CircleBoxPostHogEvent event);

class CircleBoxPostHogAdapter {
  static CircleBoxPostHogEvent mapEnvelope(
    CircleBoxAdapterEnvelope envelope, {
    String eventName = 'circlebox_context',
  }) {
    final typeCounts = <String, int>{};
    final severityCounts = <String, int>{};
    for (final event in envelope.events) {
      typeCounts[event.type] = (typeCounts[event.type] ?? 0) + 1;
      severityCounts[event.severity] = (severityCounts[event.severity] ?? 0) + 1;
    }

    final lastEvent = envelope.events.isEmpty ? null : envelope.events.last;
    return CircleBoxPostHogEvent(
      event: eventName,
      properties: {
        'schema_version': envelope.schemaVersion,
        'session_id': envelope.sessionId,
        'platform': envelope.platform,
        'export_source': envelope.exportSource,
        'capture_reason': envelope.captureReason,
        'total_events': envelope.events.length,
        'event_type_counts': typeCounts,
        'severity_counts': severityCounts,
        'last_event_type': lastEvent?.type,
        'last_event_severity': lastEvent?.severity,
      },
    );
  }

  static Future<void> forwardEnvelope(
    CircleBoxAdapterEnvelope envelope, {
    required CircleBoxPostHogCaptureSink onCapture,
    String eventName = 'circlebox_context',
  }) async {
    await onCapture(mapEnvelope(envelope, eventName: eventName));
  }
}
