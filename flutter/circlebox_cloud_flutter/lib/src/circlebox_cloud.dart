import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:circlebox_flutter/circlebox_flutter.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter/widgets.dart';
import 'package:path_provider/path_provider.dart';

import 'circlebox_cloud_config.dart';

class CircleBoxCloud {
  static CircleBoxCloudConfig? _config;
  static bool _paused = false;
  static bool _isProcessingQueue = false;
  static bool _queueLoaded = false;
  static bool _observerAttached = false;
  static bool _isForeground = true;
  static final List<_UploadTask> _uploadQueue = <_UploadTask>[];
  static File? _queueFile;
  static Timer? _flushTimer;
  static final Random _random = Random();
  static final _CircleBoxCloudLifecycleObserver _lifecycleObserver = _CircleBoxCloudLifecycleObserver();

  static Future<void> start(CircleBoxCloudConfig config) async {
    _config = config;
    _paused = false;
    await _resolveQueueFile();
    await _loadQueueIfNeeded();
    _attachLifecycleObserverIfPossible();
    _configureAutoFlushTimer();
    await _handleForegroundDrain(checkPendingCrash: config.autoExportPendingOnStart);
  }

  static Future<void> pause() async {
    _paused = true;
    _stopFlushTimer();
  }

  static Future<void> resume() async {
    _paused = false;
    _configureAutoFlushTimer();
    await _handleForegroundDrain(checkPendingCrash: true);
  }

  static Future<void> setUser(String id, {Map<String, String> attrs = const {}}) async {
    final all = <String, String>{...attrs, 'user_id': id};
    await CircleBox.breadcrumb('cloud_user_context', attrs: all);
  }

  static Future<void> captureAction(String name, {Map<String, String> attrs = const {}}) async {
    final all = <String, String>{...attrs, 'action_name': name};
    await CircleBox.breadcrumb('ui_action', attrs: all);
  }

  static Future<List<String>> flush() async {
    final config = _config;
    if (config == null) {
      throw StateError('CircleBoxCloud.start() must be called first');
    }
    if (_paused) {
      return const [];
    }

    final files = await CircleBox.exportLogs(
      formats: const {CircleBoxExportFormat.summary, CircleBoxExportFormat.jsonGzip},
    );

    await _resolveQueueFile(files);
    await _loadQueueIfNeeded();
    await _enqueueFiles(files, config);
    await _saveQueue();
    await _processQueue(config);

    return files;
  }

  static Future<void> _handleForegroundDrain({required bool checkPendingCrash}) async {
    final config = _config;
    if (config == null || _paused) {
      return;
    }

    if (checkPendingCrash && await CircleBox.hasPendingCrashReport()) {
      try {
        await flush();
      } catch (_) {
        // Keep auto-drain best-effort and non-throwing.
      }
      return;
    }

    if (config.enableAutoFlush) {
      await _processQueue(config);
    }
  }

  static void _attachLifecycleObserverIfPossible() {
    if (_observerAttached) {
      return;
    }

    final binding = WidgetsFlutterBinding.ensureInitialized();
    _observerAttached = true;
    _isForeground = _isForegroundState(binding.lifecycleState);
    binding.addObserver(_lifecycleObserver);
  }

  static void _onLifecycleChanged(AppLifecycleState state) {
    _isForeground = _isForegroundState(state);
    if (_isForeground) {
      _configureAutoFlushTimer();
      unawaited(_handleForegroundDrain(checkPendingCrash: true));
    } else {
      _stopFlushTimer();
    }
  }

  static bool _isForegroundState(AppLifecycleState? state) {
    if (state == null) {
      return true;
    }
    return state == AppLifecycleState.resumed || state == AppLifecycleState.inactive;
  }

  static void _configureAutoFlushTimer() {
    final config = _config;
    if (config == null || _paused || !config.enableAutoFlush || !_isForeground) {
      _stopFlushTimer();
      return;
    }
    if (_flushTimer != null) {
      return;
    }

    _flushTimer = Timer.periodic(Duration(seconds: config.flushIntervalSec), (_) {
      final localConfig = _config;
      if (localConfig == null || _paused || !localConfig.enableAutoFlush || !_isForeground) {
        return;
      }
      unawaited(_processQueue(localConfig));
    });
  }

  static void _stopFlushTimer() {
    _flushTimer?.cancel();
    _flushTimer = null;
  }

  static Future<void> _processQueue(CircleBoxCloudConfig config) async {
    if (_isProcessingQueue) {
      return;
    }
    _isProcessingQueue = true;
    final client = HttpClient();
    try {
      while (true) {
        if (_paused) {
          break;
        }

        final task = _nextReadyTask();
        if (task == null) {
          break;
        }

        final file = File(task.filePath);
        if (!await file.exists()) {
          _removeTask(task.id);
          await _saveQueue();
          continue;
        }

        final payload = await file.readAsBytes();
        final endpoint = config.endpoint.resolve(task.endpointPath);
        final outcome = await _uploadOnce(
          client: client,
          endpoint: endpoint,
          ingestKey: config.ingestKey,
          idempotencyKey: task.idempotencyKey,
          contentType: task.contentType,
          payload: payload,
        );

        switch (outcome) {
          case _UploadOutcome.success:
            _removeTask(task.id);
          case _UploadOutcome.retryable:
            _rescheduleTask(task.id, config.retryMaxBackoffSec);
          case _UploadOutcome.permanent:
            _removeTask(task.id);
        }
        await _saveQueue();
      }
    } finally {
      _isProcessingQueue = false;
      client.close(force: true);
      await _saveQueue();
    }
  }

  static Future<_UploadOutcome> _uploadOnce({
    required HttpClient client,
    required Uri endpoint,
    required String ingestKey,
    required String idempotencyKey,
    required String contentType,
    required List<int> payload,
  }) async {
    try {
      final request = await client.postUrl(endpoint);
      request.headers.set('x-circlebox-ingest-key', ingestKey);
      request.headers.set('x-circlebox-idempotency-key', idempotencyKey);
      request.headers.set('content-type', contentType);
      request.add(payload);
      final response = await request.close();
      final code = response.statusCode;

      if (code >= 200 && code <= 299) {
        return _UploadOutcome.success;
      }
      if (_isRetryableStatus(code)) {
        return _UploadOutcome.retryable;
      }
      await CircleBox.breadcrumb(
        'cloud_upload_dropped',
        attrs: <String, String>{
          'status_code': code.toString(),
          'endpoint': endpoint.toString(),
        },
      );
      return _UploadOutcome.permanent;
    } catch (_) {
      return _UploadOutcome.retryable;
    }
  }

  static bool _isRetryableStatus(int code) {
    if (code >= 500) {
      return true;
    }
    return code == 408 || code == 409 || code == 425 || code == 429;
  }

  static Future<void> _enqueueFiles(List<String> files, CircleBoxCloudConfig config) async {
    for (final path in files) {
      final file = File(path);
      if (!await file.exists()) {
        continue;
      }
      final payload = await file.readAsBytes();
      final endpointPath = path.endsWith('summary.json') ? 'v1/ingest/fragment' : 'v1/ingest/report';
      final contentType = path.endsWith('.gz') ? 'application/json+gzip' : 'application/json';
      final idempotencyKey = _buildIdempotencyKey(endpointPath, payload);
      if (_uploadQueue.any((task) => task.idempotencyKey == idempotencyKey)) {
        continue;
      }

      _uploadQueue.add(
        _UploadTask(
          id: _nextId(),
          endpointPath: endpointPath,
          filePath: path,
          contentType: contentType,
          idempotencyKey: idempotencyKey,
          payloadBytes: payload.length,
          createdUnixMs: _nowMs(),
          attempts: 0,
          nextAttemptUnixMs: _nowMs(),
        ),
      );
    }
    _trimQueue(config.maxQueueMb * 1024 * 1024);
  }

  static void _trimQueue(int maxBytes) {
    var total = _uploadQueue.fold<int>(0, (acc, task) => acc + task.payloadBytes);
    while (total > maxBytes && _uploadQueue.isNotEmpty) {
      _uploadQueue.sort((a, b) => a.createdUnixMs.compareTo(b.createdUnixMs));
      final removed = _uploadQueue.removeAt(0);
      total -= removed.payloadBytes;
    }
  }

  static _UploadTask? _nextReadyTask() {
    final now = _nowMs();
    final ready = _uploadQueue.where((task) => task.nextAttemptUnixMs <= now).toList()
      ..sort((a, b) => a.createdUnixMs.compareTo(b.createdUnixMs));
    return ready.isEmpty ? null : ready.first;
  }

  static void _removeTask(String id) {
    _uploadQueue.removeWhere((task) => task.id == id);
  }

  static void _rescheduleTask(String id, int maxBackoffSec) {
    final index = _uploadQueue.indexWhere((task) => task.id == id);
    if (index < 0) {
      return;
    }
    final current = _uploadQueue[index];
    final attempts = current.attempts + 1;
    _uploadQueue[index] = current.copyWith(
      attempts: attempts,
      nextAttemptUnixMs: _nextAttemptUnixMs(attempts, maxBackoffSec),
    );
  }

  static int _nextAttemptUnixMs(int attempts, int maxBackoffSec) {
    final exponent = max(0, attempts - 1);
    final base = min(pow(2, exponent).toDouble(), maxBackoffSec.toDouble());
    final jitter = _random.nextDouble() * (base * 0.25);
    final delayMs = max(100, ((base + jitter) * 1000).round());
    return _nowMs() + delayMs;
  }

  static String _buildIdempotencyKey(String endpointPath, List<int> payload) {
    final digest = sha256.convert(<int>[...utf8.encode(endpointPath), ...payload]).toString();
    return 'cb_$digest';
  }

  static String _nextId() {
    return 'task_${DateTime.now().microsecondsSinceEpoch}_${_random.nextInt(1 << 32)}';
  }

  static int _nowMs() => DateTime.now().millisecondsSinceEpoch;

  static Future<void> _resolveQueueFile([List<String> files = const <String>[]]) async {
    if (_queueFile != null) {
      return;
    }

    try {
      final supportDir = await getApplicationSupportDirectory();
      final circleBoxDir = Directory('${supportDir.path}${Platform.pathSeparator}circlebox');
      final cloudDir = Directory('${circleBoxDir.path}${Platform.pathSeparator}cloud');
      await cloudDir.create(recursive: true);
      _queueFile = File('${cloudDir.path}${Platform.pathSeparator}upload-queue.json');
      return;
    } catch (_) {
      // Fall through to legacy path derivation for compatibility.
    }

    if (files.isEmpty) {
      return;
    }

    final first = File(files.first);
    final exportsDir = first.parent;
    final circleBoxDir = exportsDir.parent;
    final cloudDir = Directory('${circleBoxDir.path}${Platform.pathSeparator}cloud');
    await cloudDir.create(recursive: true);
    _queueFile = File('${cloudDir.path}${Platform.pathSeparator}upload-queue.json');
  }

  static Future<void> _loadQueueIfNeeded() async {
    if (_queueLoaded) {
      return;
    }
    _queueLoaded = true;

    final queueFile = _queueFile;
    if (queueFile == null || !await queueFile.exists()) {
      _uploadQueue.clear();
      return;
    }

    final content = await queueFile.readAsString();
    if (content.trim().isEmpty) {
      _uploadQueue.clear();
      return;
    }

    try {
      final decoded = jsonDecode(content);
      if (decoded is List<dynamic>) {
        _uploadQueue
          ..clear()
          ..addAll(
            decoded.whereType<Map<String, dynamic>>().map(_UploadTask.fromJson),
          );
      } else {
        _uploadQueue.clear();
      }
    } catch (_) {
      _uploadQueue.clear();
    }
  }

  static Future<void> _saveQueue() async {
    final queueFile = _queueFile;
    if (queueFile == null) {
      return;
    }
    await queueFile.parent.create(recursive: true);
    final serialized = jsonEncode(_uploadQueue.map((task) => task.toJson()).toList(growable: false));
    await queueFile.writeAsString(serialized, flush: true);
  }
}

class _CircleBoxCloudLifecycleObserver extends WidgetsBindingObserver {
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    CircleBoxCloud._onLifecycleChanged(state);
  }
}

enum _UploadOutcome {
  success,
  retryable,
  permanent,
}

class _UploadTask {
  const _UploadTask({
    required this.id,
    required this.endpointPath,
    required this.filePath,
    required this.contentType,
    required this.idempotencyKey,
    required this.payloadBytes,
    required this.createdUnixMs,
    required this.attempts,
    required this.nextAttemptUnixMs,
  });

  final String id;
  final String endpointPath;
  final String filePath;
  final String contentType;
  final String idempotencyKey;
  final int payloadBytes;
  final int createdUnixMs;
  final int attempts;
  final int nextAttemptUnixMs;

  Map<String, Object> toJson() {
    return <String, Object>{
      'id': id,
      'endpoint_path': endpointPath,
      'file_path': filePath,
      'content_type': contentType,
      'idempotency_key': idempotencyKey,
      'payload_bytes': payloadBytes,
      'created_unix_ms': createdUnixMs,
      'attempts': attempts,
      'next_attempt_unix_ms': nextAttemptUnixMs,
    };
  }

  factory _UploadTask.fromJson(Map<String, dynamic> json) {
    return _UploadTask(
      id: json['id'] as String? ?? '',
      endpointPath: json['endpoint_path'] as String? ?? 'v1/ingest/report',
      filePath: json['file_path'] as String? ?? '',
      contentType: json['content_type'] as String? ?? 'application/json',
      idempotencyKey: json['idempotency_key'] as String? ?? '',
      payloadBytes: (json['payload_bytes'] as num?)?.toInt() ?? 0,
      createdUnixMs: (json['created_unix_ms'] as num?)?.toInt() ?? 0,
      attempts: (json['attempts'] as num?)?.toInt() ?? 0,
      nextAttemptUnixMs: (json['next_attempt_unix_ms'] as num?)?.toInt() ?? 0,
    );
  }

  _UploadTask copyWith({
    int? attempts,
    int? nextAttemptUnixMs,
  }) {
    return _UploadTask(
      id: id,
      endpointPath: endpointPath,
      filePath: filePath,
      contentType: contentType,
      idempotencyKey: idempotencyKey,
      payloadBytes: payloadBytes,
      createdUnixMs: createdUnixMs,
      attempts: attempts ?? this.attempts,
      nextAttemptUnixMs: nextAttemptUnixMs ?? this.nextAttemptUnixMs,
    );
  }
}
