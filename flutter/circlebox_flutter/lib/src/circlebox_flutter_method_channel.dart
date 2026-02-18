import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'circlebox_config.dart';
import 'circlebox_export_format.dart';
import 'circlebox_flutter_platform_interface.dart';

class MethodChannelCircleBoxFlutter extends CircleBoxFlutterPlatform {
  @visibleForTesting
  final methodChannel = const MethodChannel('circlebox_flutter');

  @override
  Future<void> start(CircleBoxConfig config) async {
    await methodChannel.invokeMethod<void>('start', config.toMap());
  }

  @override
  Future<void> breadcrumb(String message, {Map<String, String> attrs = const {}}) async {
    await methodChannel.invokeMethod<void>('breadcrumb', {
      'message': message,
      'attrs': attrs,
    });
  }

  @override
  Future<List<String>> exportLogs({Set<CircleBoxExportFormat> formats = const {CircleBoxExportFormat.json, CircleBoxExportFormat.csv}}) async {
    final raw = await methodChannel.invokeListMethod<String>('exportLogs', {
      'formats': formats.map((item) => item.wireName).toList(),
    });
    return raw ?? const [];
  }

  @override
  Future<bool> hasPendingCrashReport() async {
    final result = await methodChannel.invokeMethod<bool>('hasPendingCrashReport');
    return result ?? false;
  }

  @override
  Future<void> clearPendingCrashReport() async {
    await methodChannel.invokeMethod<void>('clearPendingCrashReport');
  }
}
