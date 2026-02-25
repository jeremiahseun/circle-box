# Build Test Release

## Scope
Use this guide for Gradle setup, test strategy, versioning, publication, and CI release gates.

## Build Configuration Defaults
- Keep shared Gradle configuration in convention plugins or root build logic.
- Prefer Gradle Kotlin DSL.
- Keep Kotlin and Android plugin versions aligned across modules.
- Enable build caching and configuration cache where compatible.
- Track Java/Kotlin target versions explicitly.

## Local Verification Sequence
1. Discover tasks and module boundaries.
- `./gradlew tasks`
- `./gradlew projects`
2. Run narrow checks first.
- `./gradlew :module:lint :module:test`
- `./gradlew :app:assembleDebug`
3. Run broader validation before merge.
- `./gradlew lint test`
- `./gradlew connectedAndroidTest` (when instrumentation changes)
4. Run release-specific checks when needed.
- `./gradlew :sdk:publishToMavenLocal`
- `./gradlew :app:assembleRelease`

## Test Strategy by Change Type
- `UI-only`: Compose/UI tests plus ViewModel tests.
- `Domain/data`: unit tests plus integration tests at boundaries.
- `SDK/API`: contract, serialization, and compatibility tests.
- `Build/release`: dry-run publication and dependency resolution checks.

## Versioning and Release Discipline
- Use semantic versioning for SDKs.
- Bump major on breaking API/behavior changes.
- Keep changelog entries scoped and user-focused.
- Tag releases consistently and map tags to published artifacts.
- Keep release notes explicit about migration actions.

## Publishing Guidance
- Publish to local Maven first for smoke tests.
- Verify generated metadata (POM/module metadata) before external publish.
- Sign artifacts where repository policy requires it.
- Validate Dokka/Javadocs generation for public APIs.
- Include sources and docs jars for public distribution.

## CI Gates
- Fail fast on lint/static analysis/test failures.
- Block release jobs unless version/tag policy is satisfied.
- Keep secrets out of logs and artifacts.
- Keep release jobs reproducible and idempotent.
- Archive test reports and publish logs for debugging.

## Pre-release Checklist
- Verify API compatibility status.
- Verify samples compile and run.
- Verify migration notes and changelog.
- Verify rollback path (previous artifact availability and downgrade guidance).
