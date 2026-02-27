import 'dart:async';
import 'dart:isolate';
import 'dart:ui';

import 'package:flutter/foundation.dart';

import 'circlebox_config.dart';
import 'circlebox_debug_event.dart';
import 'circlebox_export_format.dart';
import 'circlebox_flutter_platform_interface.dart';

/// Flutter-facing API for CircleBox native SDKs.
class CircleBox {
  static bool _flutterHooksInstalled = false;
  static bool _captureSilentFlutterErrors = false;
  static bool _captureCurrentIsolateErrors = true;

  static FlutterExceptionHandler? _previousFlutterErrorHandler;
  static ErrorCallback? _previousPlatformDispatcherOnError;
  static RawReceivePort? _isolateErrorPort;
  static StreamController<CircleBoxDebugEvent>? _realtimeController;
  static Timer? _realtimePollTimer;
  static int _realtimeLastSeq = -1;
  static int _realtimeMaxEvents = 200;

  /// Starts the native SDK with [config].
  ///
  /// Safe to call during app startup.
  static Future<void> start({CircleBoxConfig config = const CircleBoxConfig()}) async {
    await CircleBoxFlutterPlatform.instance.start(config);

    if (config.installFlutterErrorHooks) {
      _captureSilentFlutterErrors = config.captureSilentFlutterErrors;
      _captureCurrentIsolateErrors = config.captureCurrentIsolateErrors;
      _installFlutterErrorHooks();
    }
  }

  /// Adds a custom breadcrumb event to the in-memory ring buffer.
  static Future<void> breadcrumb(String message, {Map<String, String> attrs = const {}}) {
    return CircleBoxFlutterPlatform.instance.breadcrumb(message, attrs: attrs);
  }

  /// Exports logs in the requested [formats] and returns absolute file paths.
  static Future<List<String>> exportLogs({Set<CircleBoxExportFormat> formats = const {CircleBoxExportFormat.json, CircleBoxExportFormat.csv}}) {
    return CircleBoxFlutterPlatform.instance.exportLogs(formats: formats);
  }

  /// Returns whether a previous crash left a pending report.
  static Future<bool> hasPendingCrashReport() {
    return CircleBoxFlutterPlatform.instance.hasPendingCrashReport();
  }

  /// Clears the pending crash report from native storage.
  static Future<void> clearPendingCrashReport() {
    return CircleBoxFlutterPlatform.instance.clearPendingCrashReport();
  }

  /// Returns a debug snapshot of in-memory events from native ring buffers.
  ///
  /// This returns an empty list unless native SDKs are started with `enableDebugViewer`.
  static Future<List<CircleBoxDebugEvent>> debugSnapshot({int maxEvents = 200}) async {
    final raw = await CircleBoxFlutterPlatform.instance.debugSnapshot(maxEvents: maxEvents);
    return raw.map(CircleBoxDebugEvent.fromMap).toList(growable: false);
  }

  /// Returns a realtime event stream sourced from native CircleBox snapshots.
  ///
  /// This stream is best-effort and designed for adapter forwarding flows.
  static Stream<CircleBoxDebugEvent> eventStream({
    CircleBoxRealtimeFilter filter = const CircleBoxRealtimeFilter(),
    Duration pollInterval = const Duration(milliseconds: 500),
    int maxEvents = 200,
  }) {
    _realtimeMaxEvents = maxEvents < 1 ? 1 : maxEvents;
    _ensureRealtimeController(pollInterval);
    return _realtimeController!.stream.where(filter.matches);
  }

  static void _ensureRealtimeController(Duration pollInterval) {
    if (_realtimeController != null) {
      return;
    }

    _realtimeController = StreamController<CircleBoxDebugEvent>.broadcast(
      onListen: () {
        _realtimePollTimer ??= Timer.periodic(pollInterval, (_) {
          unawaited(_pollRealtimeEvents());
        });
        unawaited(_pollRealtimeEvents());
      },
      onCancel: () {
        if (!(_realtimeController?.hasListener ?? false)) {
          _realtimePollTimer?.cancel();
          _realtimePollTimer = null;
        }
      },
    );
  }

  static Future<void> _pollRealtimeEvents() async {
    final controller = _realtimeController;
    if (controller == null) {
      return;
    }

    try {
      final snapshot = await debugSnapshot(maxEvents: _realtimeMaxEvents);
      for (final event in snapshot) {
        if (event.seq <= _realtimeLastSeq) {
          continue;
        }
        _realtimeLastSeq = event.seq;
        controller.add(event);
      }
    } catch (_) {
      // Realtime polling is best-effort and must not throw into host app.
    }
  }

  static void _installFlutterErrorHooks() {
    if (_flutterHooksInstalled) {
      return;
    }
    _flutterHooksInstalled = true;

    _previousFlutterErrorHandler = FlutterError.onError;
    FlutterError.onError = (FlutterErrorDetails details) {
      if (_captureSilentFlutterErrors || !details.silent) {
        unawaited(
          _recordFlutterError(
            origin: 'flutter_framework',
            error: details.exception,
            stackTrace: details.stack,
            context: details.context?.toDescription(),
          ),
        );
      }

      _previousFlutterErrorHandler?.call(details);
    };

    _previousPlatformDispatcherOnError = PlatformDispatcher.instance.onError;
    PlatformDispatcher.instance.onError = (Object error, StackTrace stackTrace) {
      unawaited(
        _recordFlutterError(
          origin: 'platform_dispatcher',
          error: error,
          stackTrace: stackTrace,
        ),
      );

      final previous = _previousPlatformDispatcherOnError;
      if (previous != null) {
        return previous(error, stackTrace);
      }
      return false;
    };

    if (_captureCurrentIsolateErrors && !kIsWeb && _isolateErrorPort == null) {
      final port = RawReceivePort((dynamic payload) {
        final parsed = _parseIsolateErrorPayload(payload);
        unawaited(
          _recordFlutterError(
            origin: 'isolate',
            error: parsed.error,
            stackTrace: parsed.stackTrace,
          ),
        );
      });
      _isolateErrorPort = port;
      Isolate.current.addErrorListener(port.sendPort);
    }
  }

  static _IsolateErrorPayload _parseIsolateErrorPayload(dynamic payload) {
    if (payload is List && payload.length >= 2) {
      final Object error = payload[0] ?? 'Unknown isolate error';
      final dynamic stack = payload[1];
      if (stack is StackTrace) {
        return _IsolateErrorPayload(error, stack);
      }
      if (stack is String) {
        return _IsolateErrorPayload(error, StackTrace.fromString(stack));
      }
      return _IsolateErrorPayload(error, null);
    }

    if (payload is Object) {
      return _IsolateErrorPayload(payload, null);
    }
    return const _IsolateErrorPayload('Unknown isolate error', null);
  }

  static Future<void> _recordFlutterError({
    required String origin,
    required Object error,
    StackTrace? stackTrace,
    String? context,
  }) async {
    final attrs = <String, String>{
      'origin': origin,
      'error_type': error.runtimeType.toString(),
      'error': error.toString(),
      if (context != null) 'context': context,
      if (stackTrace != null) 'stack': stackTrace.toString(),
    };

    try {
      await CircleBoxFlutterPlatform.instance.breadcrumb('flutter_exception', attrs: attrs);
    } catch (_) {
      // Global error hooks must not throw into host app code paths.
    }
  }
}

class CircleBoxRealtimeFilter {
  const CircleBoxRealtimeFilter({
    this.forwardAll = false,
    this.includeEventTypes = const <String>{},
  });

  final bool forwardAll;
  final Set<String> includeEventTypes;

  bool matches(CircleBoxDebugEvent event) {
    if (includeEventTypes.isNotEmpty && !includeEventTypes.contains(event.type)) {
      return false;
    }
    if (forwardAll) {
      return true;
    }

    if (event.type == 'breadcrumb' || event.type == 'native_exception_prehook') {
      return true;
    }
    return event.severity == 'warn' || event.severity == 'error' || event.severity == 'fatal';
  }
}

final class _IsolateErrorPayload {
  const _IsolateErrorPayload(this.error, this.stackTrace);

  final Object error;
  final StackTrace? stackTrace;
}
