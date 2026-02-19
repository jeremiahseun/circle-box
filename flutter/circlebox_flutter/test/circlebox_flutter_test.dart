import 'package:circlebox_flutter/circlebox_flutter.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const channel = MethodChannel('circlebox_flutter');

  final calls = <MethodCall>[];

  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    calls.clear();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      calls.add(call);
      switch (call.method) {
        case 'hasPendingCrashReport':
          return false;
        case 'exportLogs':
          return <String>[];
        case 'debugSnapshot':
          return <Map<String, Object?>>[
            {
              'seq': 9,
              'timestamp_unix_ms': 1234,
              'uptime_ms': 567,
              'type': 'breadcrumb',
              'thread': 'main',
              'severity': 'info',
              'attrs': {'message': 'hello'}
            }
          ];
        default:
          return null;
      }
    });
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  test('start forwards config over method channel', () async {
    await CircleBox.start();

    expect(calls.single.method, 'start');
    final args = calls.single.arguments as Map<Object?, Object?>;
    expect(args['bufferCapacity'], 50);
    expect(args['jankThresholdMs'], 200);
    expect(args['installFlutterErrorHooks'], true);
    expect(args['captureSilentFlutterErrors'], false);
    expect(args['captureCurrentIsolateErrors'], true);
    expect(args['enableDebugViewer'], false);
  });

  test('start forwards flutter hook config overrides', () async {
    await CircleBox.start(
      config: const CircleBoxConfig(
        installFlutterErrorHooks: false,
        captureSilentFlutterErrors: true,
        captureCurrentIsolateErrors: false,
        enableDebugViewer: true,
      ),
    );

    expect(calls.single.method, 'start');
    final args = calls.single.arguments as Map<Object?, Object?>;
    expect(args['installFlutterErrorHooks'], false);
    expect(args['captureSilentFlutterErrors'], true);
    expect(args['captureCurrentIsolateErrors'], false);
    expect(args['enableDebugViewer'], true);
  });

  test('breadcrumb forwards message and attrs', () async {
    await CircleBox.breadcrumb('User started Checkout', attrs: {'flow': 'checkout'});

    expect(calls.single.method, 'breadcrumb');
    final args = calls.single.arguments as Map<Object?, Object?>;
    expect(args['message'], 'User started Checkout');
  });

  test('exportLogs forwards extended export format names', () async {
    await CircleBox.exportLogs(
      formats: {
        CircleBoxExportFormat.jsonGzip,
        CircleBoxExportFormat.csvGzip,
        CircleBoxExportFormat.summary,
      },
    );

    expect(calls.single.method, 'exportLogs');
    final args = calls.single.arguments as Map<Object?, Object?>;
    final formats = (args['formats'] as List<Object?>).cast<String>().toSet();
    expect(formats.contains('json_gzip'), true);
    expect(formats.contains('csv_gzip'), true);
    expect(formats.contains('summary'), true);
  });

  test('debugSnapshot returns parsed debug events', () async {
    final events = await CircleBox.debugSnapshot(maxEvents: 50);

    expect(calls.single.method, 'debugSnapshot');
    final args = calls.single.arguments as Map<Object?, Object?>;
    expect(args['maxEvents'], 50);

    expect(events.length, 1);
    expect(events.first.seq, 9);
    expect(events.first.type, 'breadcrumb');
    expect(events.first.attrs['message'], 'hello');
  });
}
