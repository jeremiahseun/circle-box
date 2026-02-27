import 'dart:async';

import 'package:circlebox_flutter/circlebox_flutter.dart';

import 'circlebox_adapter_models.dart';
import 'circlebox_export_parser.dart';
import 'circlebox_posthog_adapter.dart';
import 'circlebox_sentry_adapter.dart';

class CircleBoxAdapterForwarder {
  static Future<void> forwardExportPath(
    String path, {
    CircleBoxSentryBreadcrumbSink? onSentryBreadcrumb,
    CircleBoxPostHogCaptureSink? onPostHogCapture,
    String postHogEventName = 'circlebox_context',
  }) async {
    final envelope = await CircleBoxExportParser.parsePath(path);
    if (envelope == null) {
      return;
    }

    if (onSentryBreadcrumb != null) {
      await CircleBoxSentryAdapter.forwardEnvelope(envelope, onBreadcrumb: onSentryBreadcrumb);
    }
    if (onPostHogCapture != null) {
      await CircleBoxPostHogAdapter.forwardEnvelope(
        envelope,
        onCapture: onPostHogCapture,
        eventName: postHogEventName,
      );
    }
  }

  static Future<void> forwardExportPaths(
    List<String> paths, {
    CircleBoxSentryBreadcrumbSink? onSentryBreadcrumb,
    CircleBoxPostHogCaptureSink? onPostHogCapture,
    String postHogEventName = 'circlebox_context',
  }) async {
    for (final path in paths) {
      await forwardExportPath(
        path,
        onSentryBreadcrumb: onSentryBreadcrumb,
        onPostHogCapture: onPostHogCapture,
        postHogEventName: postHogEventName,
      );
    }
  }

  static StreamSubscription<CircleBoxDebugEvent> forwardRealtime({
    CircleBoxSentryBreadcrumbSink? onSentryBreadcrumb,
    CircleBoxPostHogCaptureSink? onPostHogCapture,
    bool forwardAll = false,
    Set<String> includeEventTypes = const <String>{},
    int pollIntervalMs = 500,
    int maxEvents = 200,
    String postHogEventName = 'circlebox_realtime_event',
  }) {
    return CircleBox.eventStream(
      filter: CircleBoxRealtimeFilter(
        forwardAll: forwardAll,
        includeEventTypes: includeEventTypes,
      ),
      pollInterval: Duration(milliseconds: pollIntervalMs),
      maxEvents: maxEvents,
    ).listen((event) {
      final adapterEvent = CircleBoxAdapterEvent(
        seq: event.seq,
        timestampUnixMs: event.timestampUnixMs,
        uptimeMs: event.uptimeMs,
        type: event.type,
        thread: event.thread,
        severity: event.severity,
        attrs: event.attrs,
      );

      if (onSentryBreadcrumb != null) {
        Future.sync(
          () => onSentryBreadcrumb(
            CircleBoxSentryAdapter.mapEvent(adapterEvent),
          ),
        );
      }
      if (onPostHogCapture != null) {
        Future.sync(
          () => onPostHogCapture(
            CircleBoxPostHogAdapter.mapEvent(
              adapterEvent,
              eventName: postHogEventName,
            ),
          ),
        );
      }
    });
  }
}
