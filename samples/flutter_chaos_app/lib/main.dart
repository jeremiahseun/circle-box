import 'dart:async';
import 'dart:io';
import 'dart:isolate';

import 'package:circlebox_flutter/circlebox_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await CircleBox.start(
    config: const CircleBoxConfig(
      bufferCapacity: 200,
      enableDebugViewer: true,
      installFlutterErrorHooks: true,
      captureSilentFlutterErrors: false,
      captureCurrentIsolateErrors: true,
    ),
  );
  runApp(const ChaosApp());
}

class ChaosApp extends StatelessWidget {
  const ChaosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CircleBox Flutter Chaos',
      theme: ThemeData(colorSchemeSeed: Colors.teal, useMaterial3: true),
      home: const ChaosHomeScreen(),
    );
  }
}

class ChaosHomeScreen extends StatefulWidget {
  const ChaosHomeScreen({super.key});

  @override
  State<ChaosHomeScreen> createState() => _ChaosHomeScreenState();
}

class _ChaosHomeScreenState extends State<ChaosHomeScreen> {
  static const String _allFilter = 'all';
  static const List<String> _severityOptions = [_allFilter, 'info', 'warn', 'error', 'fatal'];
  static const List<String> _threadOptions = [_allFilter, 'main', 'background', 'crash'];

  final Set<CircleBoxExportFormat> _selectedFormats = {
    CircleBoxExportFormat.json,
    CircleBoxExportFormat.csv,
    CircleBoxExportFormat.jsonGzip,
    CircleBoxExportFormat.csvGzip,
    CircleBoxExportFormat.summary,
  };

  List<_ExportItem> _exports = const [];
  List<CircleBoxDebugEvent> _debugEvents = const [];
  String? _statusMessage;
  bool _pendingDialogShown = false;
  String _typeFilter = _allFilter;
  String _severityFilter = _allFilter;
  String _threadFilter = _allFilter;

  @override
  void initState() {
    super.initState();
    _checkPendingReport();
  }

  Future<void> _checkPendingReport() async {
    final pending = await CircleBox.hasPendingCrashReport();
    if (!mounted || !pending || _pendingDialogShown) {
      return;
    }
    _pendingDialogShown = true;
    unawaited(
      showDialog<void>(
        context: context,
        builder: (context) {
          return AlertDialog(
            title: const Text('Crash Report Found'),
            content: const Text('A pending crash report exists. Export now?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Later'),
              ),
              FilledButton(
                onPressed: () async {
                  Navigator.of(context).pop();
                  await _exportLogs();
                },
                child: const Text('Export'),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _exportLogs() async {
    try {
      final files = await CircleBox.exportLogs(formats: _selectedFormats);
      final items = await Future.wait(files.map(_ExportItem.fromPath));
      if (!mounted) {
        return;
      }
      setState(() {
        _exports = items;
        _statusMessage = 'Exported ${items.length} file(s)';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _statusMessage = 'Export failed: $error';
      });
    }
  }

  Future<void> _loadViewer() async {
    final events = await CircleBox.debugSnapshot(maxEvents: 200);
    if (!mounted) {
      return;
    }
    setState(() {
      _debugEvents = events;
      final typeOptions = {_allFilter, ...events.map((event) => event.type)};
      if (!typeOptions.contains(_typeFilter)) {
        _typeFilter = _allFilter;
      }
      if (!_severityOptions.contains(_severityFilter)) {
        _severityFilter = _allFilter;
      }
      if (!_threadOptions.contains(_threadFilter)) {
        _threadFilter = _allFilter;
      }
      _statusMessage = 'Loaded ${events.length} debug event(s)';
    });
  }

  Future<void> _mock(String message, Map<String, String> attrs) {
    return CircleBox.breadcrumb(message, attrs: attrs);
  }

  Future<void> _triggerFrameworkError() async {
    FlutterError.reportError(
      FlutterErrorDetails(
        exception: StateError('CircleBox framework test exception'),
        stack: StackTrace.current,
        context: ErrorDescription('Chaos button'),
      ),
    );
    if (!mounted) {
      return;
    }
    setState(() {
      _statusMessage = 'Framework error reported';
    });
  }

  Future<void> _triggerAsyncError() async {
    Future<void>.delayed(const Duration(milliseconds: 10), () {
      throw StateError('CircleBox async unhandled test exception');
    });
    if (!mounted) {
      return;
    }
    setState(() {
      _statusMessage = 'Scheduled async unhandled error';
    });
  }

  Future<void> _triggerIsolateError() async {
    final receivePort = ReceivePort();
    await Isolate.spawn<_IsolateErrorPayload>(
      _isolateThrower,
      _IsolateErrorPayload(receivePort.sendPort),
      errorsAreFatal: false,
    );
    if (!mounted) {
      return;
    }
    setState(() {
      _statusMessage = 'Spawned isolate error';
    });
  }

  List<String> get _typeOptions {
    final types = _debugEvents.map((event) => event.type).toSet().toList(growable: false)..sort();
    return [_allFilter, ...types];
  }

  List<CircleBoxDebugEvent> get _filteredDebugEvents {
    return _debugEvents.where((event) {
      final typeMatch = _typeFilter == _allFilter || event.type == _typeFilter;
      final severityMatch = _severityFilter == _allFilter || event.severity == _severityFilter;
      final threadMatch = _threadFilter == _allFilter || event.thread == _threadFilter;
      return typeMatch && severityMatch && threadMatch;
    }).toList(growable: false);
  }

  Widget _buildFilterGroup({
    required String label,
    required List<String> options,
    required String selected,
    required ValueChanged<String> onSelected,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 6),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: options.map((value) {
            return ChoiceChip(
              label: Text(value),
              selected: selected == value,
              onSelected: (active) {
                if (!active) {
                  return;
                }
                onSelected(value);
              },
            );
          }).toList(growable: false),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredDebugEvents = _filteredDebugEvents;

    return Scaffold(
      appBar: AppBar(title: const Text('CircleBox Flutter Chaos')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _ActionSection(
            title: 'Mock Context',
            children: [
              _ActionButton(
                title: 'Mock Thermal Spike',
                onPressed: () => _mock('Mock thermal spike', {'state': 'critical'}),
              ),
              _ActionButton(
                title: 'Mock Low Battery',
                onPressed: () => _mock('Mock low battery', {'percent': '7', 'low_power_mode': 'true'}),
              ),
              _ActionButton(
                title: 'Mock No Internet',
                onPressed: () => _mock('Mock no internet', {'to': 'none'}),
              ),
              _ActionButton(
                title: 'Mock Permission Revoked',
                onPressed: () => _mock('Mock permission revoked', {'permission': 'camera', 'to': 'denied'}),
              ),
              _ActionButton(
                title: 'Mock Low Disk',
                onPressed: () => _mock('Mock low disk', {'available_bytes': '1024'}),
              ),
              _ActionButton(
                title: 'Add Breadcrumb',
                onPressed: () => _mock('User started Checkout', {'flow': 'checkout'}),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _ActionSection(
            title: 'Flutter Error Triggers',
            children: [
              _ActionButton(title: 'Framework Error', onPressed: _triggerFrameworkError),
              _ActionButton(title: 'Async Unhandled Error', onPressed: _triggerAsyncError),
              _ActionButton(title: 'Isolate Unhandled Error', onPressed: _triggerIsolateError),
            ],
          ),
          const SizedBox(height: 16),
          _ActionSection(
            title: 'Exports',
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: CircleBoxExportFormat.values.map((format) {
                  final selected = _selectedFormats.contains(format);
                  return FilterChip(
                    label: Text(_formatLabel(format)),
                    selected: selected,
                    onSelected: (value) {
                      setState(() {
                        if (value) {
                          _selectedFormats.add(format);
                        } else {
                          _selectedFormats.remove(format);
                        }
                      });
                    },
                  );
                }).toList(growable: false),
              ),
              const SizedBox(height: 12),
              _ActionButton(title: 'Export Logs', onPressed: _exportLogs),
            ],
          ),
          const SizedBox(height: 16),
          _ActionSection(
            title: 'Local Viewer',
            children: [
              _ActionButton(title: 'Load Viewer Snapshot', onPressed: _loadViewer),
              if (_debugEvents.isNotEmpty) ...[
                const SizedBox(height: 8),
                _buildFilterGroup(
                  label: 'Type',
                  options: _typeOptions,
                  selected: _typeFilter,
                  onSelected: (value) => setState(() {
                    _typeFilter = value;
                  }),
                ),
                const SizedBox(height: 8),
                _buildFilterGroup(
                  label: 'Severity',
                  options: _severityOptions,
                  selected: _severityFilter,
                  onSelected: (value) => setState(() {
                    _severityFilter = value;
                  }),
                ),
                const SizedBox(height: 8),
                _buildFilterGroup(
                  label: 'Thread',
                  options: _threadOptions,
                  selected: _threadFilter,
                  onSelected: (value) => setState(() {
                    _threadFilter = value;
                  }),
                ),
              ],
            ],
          ),
          if (_statusMessage != null) ...[
            const SizedBox(height: 12),
            Text(_statusMessage!, style: Theme.of(context).textTheme.bodySmall),
          ],
          if (_exports.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text('Exported Files', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ..._exports.map((item) => SelectableText('${item.path} (${item.sizeBytes} bytes)')),
          ],
          if (_debugEvents.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              'Viewer Events (${filteredDebugEvents.length}/${_debugEvents.length})',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            ...filteredDebugEvents.map(
              (event) => Card(
                child: ListTile(
                  dense: true,
                  title: Text('#${event.seq} ${event.type} (${event.severity})'),
                  subtitle: Text('thread=${event.thread} attrs=${event.attrs}'),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatLabel(CircleBoxExportFormat format) {
    switch (format) {
      case CircleBoxExportFormat.json:
        return 'json';
      case CircleBoxExportFormat.csv:
        return 'csv';
      case CircleBoxExportFormat.jsonGzip:
        return 'json_gzip';
      case CircleBoxExportFormat.csvGzip:
        return 'csv_gzip';
      case CircleBoxExportFormat.summary:
        return 'summary';
    }
  }
}

class _ActionSection extends StatelessWidget {
  const _ActionSection({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({required this.title, required this.onPressed});

  final String title;
  final Future<void> Function() onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SizedBox(
        width: double.infinity,
        child: FilledButton(
          onPressed: () {
            unawaited(onPressed());
          },
          child: Text(title),
        ),
      ),
    );
  }
}

class _ExportItem {
  const _ExportItem({required this.path, required this.sizeBytes});

  final String path;
  final int sizeBytes;

  static Future<_ExportItem> fromPath(String path) async {
    if (kIsWeb) {
      return _ExportItem(path: path, sizeBytes: 0);
    }
    final file = File(path);
    final size = await file.length();
    return _ExportItem(path: path, sizeBytes: size);
  }
}

class _IsolateErrorPayload {
  const _IsolateErrorPayload(this.sendPort);

  final SendPort sendPort;
}

void _isolateThrower(_IsolateErrorPayload payload) {
  payload.sendPort.send('starting');
  throw StateError('CircleBox isolate test exception');
}
