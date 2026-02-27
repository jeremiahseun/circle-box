import 'dart:async';

import 'circlebox_adapter_models.dart';

typedef CircleBoxSentryBreadcrumbSink = FutureOr<void> Function(CircleBoxSentryBreadcrumb breadcrumb);

class CircleBoxSentryAdapter {
  static List<CircleBoxSentryBreadcrumb> mapEnvelope(
    CircleBoxAdapterEnvelope envelope, {
    String sdk = 'flutter',
    String mode = 'export_adapter',
  }) {
    return envelope.events.map((event) {
      return mapEvent(event, sdk: sdk, mode: mode);
    }).toList(growable: false);
  }

  static CircleBoxSentryBreadcrumb mapEvent(
    CircleBoxAdapterEvent event, {
    String sdk = 'flutter',
    String mode = 'realtime_adapter',
  }) {
    return CircleBoxSentryBreadcrumb(
      category: 'circlebox.${event.type}',
      level: _levelFromSeverity(event.severity),
      message: event.attrs['message'] ?? event.type,
      timestampUnixMs: event.timestampUnixMs,
      data: {
        'thread': event.thread,
        'severity': event.severity,
        'circlebox_source': 'circlebox',
        'circlebox_mode': mode,
        'circlebox_sdk': sdk,
        ...event.attrs,
      },
    );
  }

  static Future<void> forwardEnvelope(
    CircleBoxAdapterEnvelope envelope, {
    required CircleBoxSentryBreadcrumbSink onBreadcrumb,
    String sdk = 'flutter',
  }) async {
    for (final breadcrumb in mapEnvelope(envelope, sdk: sdk, mode: 'export_adapter')) {
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
