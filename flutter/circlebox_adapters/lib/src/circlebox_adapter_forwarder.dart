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
}
