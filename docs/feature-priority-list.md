# CircleBox Feature Priority List

This document expands the product strategy and phased feature roadmap for CircleBox.

## Strategic Positioning

CircleBox follows an open-core model:

- The local SDK is free and open source to maximize trust and adoption.
- Paid value comes from hosted reliability infrastructure, scale, compliance, and advanced analysis.

This approach aligns with proven developer-platform companies: earn distribution with transparent OSS, then monetize operational peace of mind.

## Product Thesis

Most crash tools explain where an app failed (stack trace) but not why the operating environment became unstable first.

CircleBox solves this by keeping a bounded, high-signal environmental timeline on-device and preserving it at crash time. The core differentiator is reliability under real-world mobile constraints:

- Intermittent connectivity
- Device resource pressure
- Process deaths outside normal app control

## Roadmap Overview

## Phase 1: Flight Recorder Core (High Value / High Importance)

Goal: ship a production-safe SDK that captures pre-crash context with minimal integration effort.

### 1) Memory-Fixed Ring Buffer

- Implement fixed-capacity, thread-safe circular buffers in Swift and Kotlin.
- Default capacity: 50 events; oldest entries are overwritten on overflow.
- Keep memory usage constant regardless of session length.

Acceptance criteria:

- Capacity boundary tests at `49`, `50`, `51`, and high-volume writes.
- Concurrent producer tests pass without data races.
- Sequence IDs remain monotonic even after wraparound.

### 2) Environmental Narrative Listeners

Automatically capture high-value system context:

- Thermal state transitions
- Memory pressure signals
- Connectivity changes
- Battery level and power-saver state

Acceptance criteria:

- Listener registration works on supported OS versions.
- Events include timestamp, uptime, severity, thread, and sanitized attributes.
- Listener overhead remains within target budget (low CPU/battery impact).

### 3) Atomic Crash Flush

- Hook uncaught exception paths.
- Append final crash metadata event.
- Synchronously snapshot and persist pending report with atomic write semantics (temp file -> fsync -> rename).

Acceptance criteria:

- Pending report is discoverable on next launch.
- Previous crash handlers are chained and not broken.
- Export file remains valid after abrupt process termination.

### 4) Zero-Config Integration

- One startup call enables baseline capture.
- No manual tagging required for core system signals.
- Optional breadcrumbs extend timeline where needed.

Acceptance criteria:

- Basic setup in under 5 minutes on iOS and Android sample apps.
- Apps receive useful reports with no custom instrumentation.

## Phase 2: Ecosystem Bridge (Growth / Adoption)

Goal: reduce switching cost by integrating into existing developer workflows.

### 1) PostHog / Sentry Export

- Provide adapters to attach CircleBox context to existing crash and analytics pipelines.
- Keep integration one-line where possible.

Acceptance criteria:

- Exported payloads are deterministic and schema-versioned.
- Integration docs include examples and mapping tables.

### 2) Binary-Encoded Persistence

- Add optional binary report format (for example Protobuf/FlatBuffers) to optimize crash-time writes.
- Keep JSON/CSV as human-readable exports.

Acceptance criteria:

- Crash flush latency and report size improve versus JSON baseline.
- Decoder tooling exists for local debugging and CI fixtures.

### 3) Local Viewer UI

- Developer-only runtime viewer to inspect live ring buffer entries.
- Useful for QA and chaos testing without leaving the app.

Acceptance criteria:

- Viewer is disabled in release by default.
- Supports filtering by event type and severity.

### 4) Automatic Flutter Error Hooks

- Install default Dart/Flutter exception hooks during `CircleBox.start()`:
  - `FlutterError.onError`
  - `PlatformDispatcher.instance.onError`
  - current isolate error listener
- Convert uncaught Flutter exceptions into structured `flutter_exception` breadcrumbs so native crash context and Dart failures can be correlated in one timeline.

Acceptance criteria:

- Hooks are enabled by default and configurable through `CircleBoxConfig`.
- Uncaught framework and async Dart errors are recorded without crashing hook handlers.
- Hook installation is idempotent and does not break existing app error handlers.

### 5) React Native Bridge and Error Capture

- Add first-party React Native package exposing parity APIs:
  - `start`, `breadcrumb`, `exportLogs`, `hasPendingCrashReport`, `clearPendingCrashReport`
- Capture JavaScript exceptions and unhandled promise rejections in RN.
- Correlate RN JavaScript failures with native crash context from iOS/Android CircleBox SDKs.

Acceptance criteria:

- RN package is installable in bare and Expo prebuild workflows.
- JS-side error hooks are configurable and documented.
- Native module bridge returns absolute export paths and pending crash state.

## Phase 3: Cloud + Connectivity Breakthrough (Monetization / Innovation)

Goal: turn local crash context into durable, actionable fleet intelligence.

### 1) Predictive Low-Level Sync

- Store-and-forward queue prioritizes critical crash fragments before standard telemetry.
- Adaptive backoff and retry based on network quality and power state.

Acceptance criteria:

- Critical payloads consistently sent first when bandwidth is constrained.
- Queue policy is deterministic and test-covered.

### 2) Offline Breakthrough Path

- Experimental ultra-compact crash fragment delivery for degraded networks.
- Use delta compression and prioritization to send the smallest useful root-cause signal first.

Acceptance criteria:

- Define minimum viable fragment target (for example top 100 bytes of critical context).
- Validate delivery behavior under weak connectivity simulations.
- Clearly flag feature as experimental and platform-dependent.

### 3) CircleBox Cloud Dashboard

- Managed ingestion and storage.
- Session reconstruction and environment heatmaps.
- AI-assisted root cause summaries with confidence scoring.

Acceptance criteria:

- Cross-platform report normalization into a shared schema.
- Actionable views for engineering teams (trend, cohort, device-state correlation).
- RBAC, audit logs, and retention controls for enterprise use.

## Open-Core Monetization Model

## Free (OSS)

- Native SDKs (iOS/Android)
- Ring buffer + crash flush
- Local file export (`.circlebox`, JSON, CSV)
- Chaos test samples and developer docs

Why free:

- Low-friction adoption
- Community validation and contribution
- Broad install base that feeds paid conversion

## Paid (Cloud / Enterprise)

### Managed Storage and Ingestion

- Hosted endpoint for crash report collection.
- Charging model can start per `1,000` ingested events or sessions.

### Advanced RCA

- AI pipeline that classifies likely non-code failures (thermal kills, memory pressure, background limits).
- Suggests mitigation steps with evidence from environmental timelines.

### Compliance and Governance

- PII masking controls
- Regional data residency options
- HIPAA/GDPR-aligned workflows
- Access controls and auditability

## Offline Reliability Challenge and Solution

Problem:

- If a user crashes offline and uninstalls before reconnecting, standard deferred-upload models lose data permanently.

CircleBox approach:

- Persist complete report locally immediately on crash.
- Generate prioritized micro-fragment from critical fields.
- Attempt earliest possible transmission when any connectivity signal returns.
- Keep full report queued for complete upload when network conditions improve.

Practical impact:

- Preserves the "why" even when connectivity is unstable.
- Improves mean time to root cause because critical context reaches backend first.
- Provides defensible reliability posture in low-bandwidth markets.

## Success Metrics by Phase

Phase 1 metrics:

- Crash report capture success rate after hard crash
- SDK overhead (memory/CPU/battery)
- Time-to-integrate for new apps

Phase 2 metrics:

- Export integration adoption (PostHog/Sentry bridge usage)
- Local viewer usage in QA cycles
- Reduction in repro time for crash tickets
- Flutter hook capture rate for uncaught Dart errors
- React Native bridge adoption and JS exception coverage

Phase 3 metrics:

- Offline-to-online recovery upload success
- Critical fragment first-delivery rate
- Paid conversion and retention from OSS install base

## Execution Notes

- Keep schema versioned from day one.
- Keep naming consistent (`CircleBox`, `circlebox`, `.circlebox`).
- Treat offline pipeline as reliability-first, not volume-first.
- Preserve transparent OSS posture while differentiating with hosted operations quality.
