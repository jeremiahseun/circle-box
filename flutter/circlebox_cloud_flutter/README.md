# circlebox_cloud_flutter

Companion uploader package for CircleBox Cloud.

## Usage

```dart
await CircleBoxCloud.start(
  const CircleBoxCloudConfig(
    endpoint: Uri.parse('https://api.circlebox.dev'),
    ingestKey: 'cb_live_project_key',
    enableAutoFlush: true,
    autoExportPendingOnStart: true,
  ),
);

await CircleBoxCloud.setUser('user-123');
await CircleBoxCloud.captureAction('checkout_button_tapped');

final files = await CircleBoxCloud.flush();
print(files);
```

Behavior:
- Exports summary + gzipped report from `circlebox_flutter`
- Persists an upload queue at `.../circlebox/cloud/upload-queue.json`
- Sends `x-circlebox-idempotency-key` for server-side dedupe
- Automatically checks pending crash reports on startup and app resume
- Automatically drains queued uploads on `flushIntervalSec` while app is active
- Automatic mode drains queue only; it does not create periodic live snapshots
