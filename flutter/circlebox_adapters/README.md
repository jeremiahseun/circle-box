# circlebox_adapters

Companion adapter package for forwarding CircleBox export files into Sentry and PostHog pipelines.

## What It Does

- Ingests CircleBox export files (`json`, `json.gz`, `csv`, `csv.gz`, `summary.json`)
- Maps export content to:
  - Sentry-style breadcrumbs
  - PostHog-style capture event payloads
- Provides one-call forwarding helper for one or many export paths

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
```

This package intentionally keeps Sentry/PostHog SDK dependencies out of core CircleBox SDK modules.
