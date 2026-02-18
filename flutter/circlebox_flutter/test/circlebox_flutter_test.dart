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
  });

  test('start forwards flutter hook config overrides', () async {
    await CircleBox.start(
      config: const CircleBoxConfig(
        installFlutterErrorHooks: false,
        captureSilentFlutterErrors: true,
        captureCurrentIsolateErrors: false,
      ),
    );

    expect(calls.single.method, 'start');
    final args = calls.single.arguments as Map<Object?, Object?>;
    expect(args['installFlutterErrorHooks'], false);
    expect(args['captureSilentFlutterErrors'], true);
    expect(args['captureCurrentIsolateErrors'], false);
  });

  test('breadcrumb forwards message and attrs', () async {
    await CircleBox.breadcrumb('User started Checkout', attrs: {'flow': 'checkout'});

    expect(calls.single.method, 'breadcrumb');
    final args = calls.single.arguments as Map<Object?, Object?>;
    expect(args['message'], 'User started Checkout');
  });
}
