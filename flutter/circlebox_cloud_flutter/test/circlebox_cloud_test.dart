import 'package:circlebox_cloud_flutter/circlebox_cloud_flutter.dart';
import 'package:test/test.dart';

void main() {
  test('config stores required values', () {
    final config = CircleBoxCloudConfig(
      endpoint: Uri.parse('https://api.circlebox.dev'),
      ingestKey: 'cb_live_test',
    );

    expect(config.region, 'auto');
    expect(config.enableFragmentSync, isTrue);
    expect(config.enableAutoFlush, isTrue);
    expect(config.autoExportPendingOnStart, isTrue);
  });
}
