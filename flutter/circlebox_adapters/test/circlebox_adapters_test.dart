import 'dart:convert';
import 'dart:io';

import 'package:circlebox_adapters/circlebox_adapters.dart';
import 'package:test/test.dart';

void main() {
  test('parses envelope json and maps to adapters', () async {
    final file = File('${Directory.systemTemp.path}/circlebox-adapter-test-${DateTime.now().millisecondsSinceEpoch}.json');
    file.writeAsStringSync(
      jsonEncode({
        'schema_version': 2,
        'session_id': 's1',
        'platform': 'ios',
        'app_version': '1.0',
        'build_number': '1',
        'os_version': '17.0',
        'device_model': 'iPhone',
        'export_source': 'pending_crash',
        'capture_reason': 'uncaught_exception',
        'generated_at_unix_ms': 1234,
        'events': [
          {
            'seq': 1,
            'timestamp_unix_ms': 100,
            'uptime_ms': 10,
            'type': 'breadcrumb',
            'thread': 'main',
            'severity': 'info',
            'attrs': {'message': 'hello'}
          }
        ]
      }),
    );

    final envelope = await CircleBoxExportParser.parsePath(file.path);
    expect(envelope, isNotNull);
    expect(envelope!.events.length, 1);

    var sentryCount = 0;
    var postHogCount = 0;
    await CircleBoxAdapterForwarder.forwardExportPath(
      file.path,
      onSentryBreadcrumb: (breadcrumb) {
        sentryCount += 1;
        expect(breadcrumb.category, 'breadcrumb');
      },
      onPostHogCapture: (event) {
        postHogCount += 1;
        expect(event.event, 'circlebox_context');
      },
    );

    expect(sentryCount, 1);
    expect(postHogCount, 1);

    file.deleteSync();
  });
}
