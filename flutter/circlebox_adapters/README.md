# circlebox_adapters

Companion adapter package for forwarding CircleBox export files into Sentry and PostHog pipelines.

## Install (Git tag + monorepo path)

```yaml
dependencies:
  circlebox_adapters:
    git:
      url: https://github.com/jeremiahseun/circle-box.git
      ref: v0.3.1
      path: flutter/circlebox_adapters
```

`circlebox_adapters` depends on `circlebox_flutter` from the same tagged repository path:

```yaml
dependencies:
  circlebox_flutter:
    git:
      url: https://github.com/jeremiahseun/circle-box.git
      ref: v0.3.1
      path: flutter/circlebox_flutter
```

## What It Does

- Ingests CircleBox export files (`json`, `json.gz`, `csv`, `csv.gz`, `summary.json`)
- Maps export content to:
  - Sentry-style breadcrumbs
  - PostHog-style capture event payloads
- Provides one-call forwarding helper for one or many export paths
- Provides realtime forwarding helper using `CircleBox.eventStream`
- Adds CircleBox attribution fields (`circlebox_source`, `circlebox_mode`, `circlebox_sdk`)

## Usage

```dart
import 'package:circlebox_adapters/circlebox_adapters.dart';

await CircleBoxAdapterForwarder.forwardExportPaths(
  exportPaths,
  onSentryBreadcrumb: (breadcrumb) async {
    // Wire to sentry_flutter here.
  },
  onPostHogCapture: (event) async {
    // Wire to posthog_flutter here.
  },
);

final sub = CircleBoxAdapterForwarder.forwardRealtime(
  onSentryBreadcrumb: (breadcrumb) async {
    // Forward to sentry_flutter
  },
  onPostHogCapture: (event) async {
    // Forward to posthog_flutter
  },
);

// later
await sub.cancel();
```

This package intentionally keeps Sentry/PostHog SDK dependencies out of core CircleBox SDK modules.

## Standalone Validation

From this directory:

```bash
./scripts/package_check.sh
```
