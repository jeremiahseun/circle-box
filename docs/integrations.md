# CircleBox Companion Integrations

CircleBox keeps core SDKs dependency-free from external analytics/crash vendors.
Phase 2 integrations are implemented as companion modules/packages.

## Modules

- iOS: `integrations/ios/CircleBoxIntegrations`
- Android: `integrations/android/circlebox-integrations`
- Flutter: `flutter/circlebox_adapters`

## Design Principles

- No direct Sentry/PostHog dependency in core CircleBox SDKs.
- Deterministic mapping from CircleBox exports to downstream telemetry.
- Preserve chronology and severity semantics.

## Sentry Mapping

Companion adapters map each CircleBox event to breadcrumb-shaped payloads:

- `category`: CircleBox event `type`
- `level`: mapped from CircleBox `severity` (`fatal/error/warn/info`)
- `message`: `attrs.message` when present, otherwise `type`
- `timestamp_unix_ms`
- `data`: merged event attrs + thread/severity context

## PostHog Mapping

Companion adapters map envelope-level context into a capture event payload:

- Event name default: `circlebox_context`
- Envelope metadata as properties:
  - `schema_version`, `session_id`, `platform`
  - `export_source`, `capture_reason`
  - app/device metadata
- Summary counters:
  - `total_events`
  - `has_crash_marker`
  - per-severity totals

## Flutter One-Call Forwarding

`circlebox_adapters` provides a one-call helper that:

1. Reads an exported CircleBox file (`json`, `json.gz`, `csv`, `csv.gz`, `summary.json`)
2. Maps payloads
3. Invokes provided sinks for Sentry/PostHog

Example:

```dart
import 'package:circlebox_adapters/circlebox_adapters.dart';

await CircleBoxAdapterForwarder.forwardExportPaths(
  exportPaths,
  onSentryBreadcrumb: (breadcrumb) async {
    // sentry_flutter breadcrumb forwarding
  },
  onPostHogCapture: (event) async {
    // posthog_flutter capture forwarding
  },
);
```

## Scope

Phase 2 integrations provide mapping helpers and forwarding utilities.
Managed ingestion/storage/dashboard remains Phase 3 scope.
