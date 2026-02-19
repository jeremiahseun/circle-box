# CircleBox Migration Notes

This repository uses `CircleBox` naming and schema v2 by default.

Historical references to prior naming are intentionally documented here only for migration context. CI excludes this file from naming checks.

## Naming Migration

Global rename policy:

- Class/symbol names: `CircleBox`
- Package/module IDs: `circlebox`
- Report extension: `.circlebox`
- Android package root: `com.circlebox.sdk`

Guarding:

- Run `scripts/check_naming.sh`
- CI fails on `blackbox|BlackBox|BLACKBOX` matches outside this file

## Schema Migration (v1 -> v2)

v2 changes:

- `schema_version` default changed from `1` to `2`
- Canonical serialization uses snake_case keys across iOS and Android
- New envelope fields:
  - `export_source`: `pending_crash | live_snapshot`
  - `capture_reason`: `uncaught_exception | manual_export | startup_pending_detection`
- CSV now includes metadata rows with provenance before event rows

Compatibility behavior:

- Legacy v1 pending/checkpoint files are still readable
- During export, legacy data is normalized to v2 output
- Existing public APIs are unchanged (`start`, `breadcrumb`, `exportLogs`, `hasPendingCrashReport`, `clearPendingCrashReport`)

See `docs/schema-v1.md` and `docs/schema-v2.md` for full field references.
