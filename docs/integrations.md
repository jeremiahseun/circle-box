# CircleBox Companion Integrations

CircleBox keeps core SDKs dependency-free from external analytics/crash vendors.
Phase 2 integrations are implemented as companion modules/packages.

## Modules

- iOS: `integrations/ios/CircleBoxIntegrations`
- Android: `integrations/android/circlebox-integrations`
- Flutter: `flutter/circlebox_adapters`
- React Native: `react-native/circlebox-react-native` realtime adapter helpers

## Design Principles

- No direct Sentry/PostHog dependency in core CircleBox SDKs.
- Deterministic mapping from CircleBox exports to downstream telemetry.
- Preserve chronology and severity semantics.
- Include attribution fields in forwarded payloads:
  - `circlebox_source=circlebox`
  - `circlebox_mode=export_adapter|realtime_adapter`
  - `circlebox_sdk=<platform>@<version|name>`

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

## Realtime Forwarding

High-signal realtime forwarding is available in Flutter and React Native helpers.

- Default stream policy forwards: `warn/error/fatal`, `breadcrumb`, `native_exception_prehook`
- Optional `forwardAll` toggle can include all events
- Forwarding paths are best-effort and non-throwing

## Scope

Phase 2 integrations provide mapping helpers and forwarding utilities.
Managed ingestion/storage/dashboard remains Phase 3 scope.

## Installation Paths

You can run CircleBox:

1. **Without adapters** (core only or core + cloud)
2. **With adapters** (core + optional Sentry/PostHog forwarding)

For install commands by platform, use the release matrix in:
- `cloud/dashboard/content/docs/release-matrix.mdx`
