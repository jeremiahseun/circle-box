# circlebox-cloud-react-native

Companion uploader for sending CircleBox exports to CircleBox Cloud.

## Usage

```ts
import * as CircleBoxCloud from 'circlebox-cloud-react-native';

await CircleBoxCloud.start({
  endpoint: 'https://api.circlebox.dev',
  ingestKey: 'cb_live_project_key',
  enableAutoFlush: true,
  autoExportPendingOnStart: true,
});

await CircleBoxCloud.setUser('user-123');
await CircleBoxCloud.captureAction('checkout_tapped');

await CircleBoxCloud.flush();
```

Behavior:
- Queues uploads in memory by default, and persists queue if host app provides `@react-native-async-storage/async-storage`
- Sends summary first, then full report
- Uses `x-circlebox-idempotency-key` to deduplicate retry uploads
- Automatically checks pending crash reports on startup and app foreground transitions
- Automatically drains queued uploads on `flushIntervalSec` while app is active
- Automatic mode drains queue only; it does not create periodic live snapshots
