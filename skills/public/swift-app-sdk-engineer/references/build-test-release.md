# Build Test Release

## Scope
Use this guide for SwiftPM and Xcode setup, test strategy, versioning, publication, and CI release gates.

## Build Configuration Defaults
- Keep shared build settings centralized.
- Prefer Swift Package Manager for reusable modules and SDKs.
- Keep Swift tools and deployment targets aligned across modules.
- Track minimum OS versions explicitly.
- Keep warning policies and lint rules consistent in CI and local runs.

## Local Verification Sequence
1. Discover package and scheme boundaries.
- `swift package describe`
- `xcodebuild -list -project <project>.xcodeproj`
2. Run narrow checks first.
- `swift test --package-path <path>`
- `xcodebuild test -scheme <scheme> -destination 'platform=iOS Simulator,name=iPhone 16'`
3. Run broader validation before merge.
- `swift test`
- full workspace/scheme test matrix where applicable.
4. Run release-specific checks when needed.
- archive or build release configuration.
- verify package resolution from a clean checkout.

## Test Strategy by Change Type
- `UI-only`: UI tests plus view-model tests.
- `Domain/data`: unit tests plus integration tests at boundaries.
- `SDK/API`: contract, serialization, and compatibility tests.
- `Build/release`: clean build and dependency resolution checks.

## Versioning and Release Discipline
- Use semantic versioning for SDKs.
- Bump major on breaking API or behavior changes.
- Keep changelog entries scoped and user-focused.
- Tag releases consistently and map tags to shipped artifacts.
- Keep release notes explicit about migration actions.

## Distribution Guidance
- Validate package manifests and product exposure before release.
- Keep package resources and binary targets deterministic.
- Verify docs generation for public APIs when required.
- Validate integration from a consumer sample app before publish.

## CI Gates
- Fail fast on lint/static analysis/test failures.
- Block release jobs unless version/tag policy is satisfied.
- Keep secrets out of logs and artifacts.
- Keep release jobs reproducible and idempotent.
- Archive test reports and build logs for debugging.

## Pre-release Checklist
- Verify compatibility status.
- Verify samples compile and run.
- Verify migration notes and changelog.
- Verify rollback path (previous version availability and downgrade guidance).
