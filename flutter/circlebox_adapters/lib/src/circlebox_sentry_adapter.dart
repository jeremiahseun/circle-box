import 'dart:async';

import 'circlebox_adapter_models.dart';

typedef CircleBoxSentryBreadcrumbSink = FutureOr<void> Function(CircleBoxSentryBreadcrumb breadcrumb);

class CircleBoxSentryAdapter {
  static List<CircleBoxSentryBreadcrumb> mapEnvelope(CircleBoxAdapterEnvelope envelope) {
    return envelope.events.map((event) {
      return CircleBoxSentryBreadcrumb(
        category: event.type,
        level: _levelFromSeverity(event.severity),
        message: event.attrs['message'] ?? event.type,
        timestampUnixMs: event.timestampUnixMs,
        data: {
          'thread': event.thread,
          'severity': event.severity,
          ...event.attrs,
        },
      );
    }).toList(growable: false);
  }

  static Future<void> forwardEnvelope(
    CircleBoxAdapterEnvelope envelope, {
    required CircleBoxSentryBreadcrumbSink onBreadcrumb,
  }) async {
    for (final breadcrumb in mapEnvelope(envelope)) {
      await onBreadcrumb(breadcrumb);
    }
  }

  static String _levelFromSeverity(String severity) {
    switch (severity) {
      case 'fatal':
        return 'fatal';
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      default:
        return 'info';
    }
  }
}
