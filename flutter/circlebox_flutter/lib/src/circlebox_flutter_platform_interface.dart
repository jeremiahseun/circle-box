import 'package:plugin_platform_interface/plugin_platform_interface.dart';

import 'circlebox_config.dart';
import 'circlebox_export_format.dart';
import 'circlebox_flutter_method_channel.dart';

/// Platform interface for CircleBox Flutter plugin implementations.
abstract class CircleBoxFlutterPlatform extends PlatformInterface {
  CircleBoxFlutterPlatform() : super(token: _token);

  static final Object _token = Object();

  static CircleBoxFlutterPlatform _instance = MethodChannelCircleBoxFlutter();

  static CircleBoxFlutterPlatform get instance => _instance;

  static set instance(CircleBoxFlutterPlatform instance) {
    PlatformInterface.verifyToken(instance, _token);
    _instance = instance;
  }

  /// Starts the platform implementation.
  Future<void> start(CircleBoxConfig config) {
    throw UnimplementedError('start() has not been implemented.');
  }

  /// Adds a breadcrumb event.
  Future<void> breadcrumb(String message, {Map<String, String> attrs = const {}}) {
    throw UnimplementedError('breadcrumb() has not been implemented.');
  }

  /// Exports current/pending logs and returns absolute file paths.
  Future<List<String>> exportLogs({Set<CircleBoxExportFormat> formats = const {CircleBoxExportFormat.json, CircleBoxExportFormat.csv}}) {
    throw UnimplementedError('exportLogs() has not been implemented.');
  }

  /// Returns true when a pending crash report exists.
  Future<bool> hasPendingCrashReport() {
    throw UnimplementedError('hasPendingCrashReport() has not been implemented.');
  }

  /// Deletes any pending crash report file.
  Future<void> clearPendingCrashReport() {
    throw UnimplementedError('clearPendingCrashReport() has not been implemented.');
  }

  /// Returns a debug snapshot of in-memory ring-buffer events.
  Future<List<Map<Object?, Object?>>> debugSnapshot({int maxEvents = 200}) {
    throw UnimplementedError('debugSnapshot() has not been implemented.');
  }
}
