---
name: kotlin-app-sdk-engineer
description: Build, refactor, test, and release Kotlin software for Android apps and reusable SDKs. Use when tasks involve Kotlin and Gradle projects, Jetpack Compose UI, app architecture, coroutine and Flow state management, modularization, performance tuning, library or SDK API design, compatibility management, Maven publishing, or developer-facing documentation and samples.
---

# Kotlin App Sdk Engineer

## Overview

Build production Kotlin systems across two tracks:
1. Ship scalable Android apps with reliable UI architecture.
2. Ship stable Kotlin libraries and SDKs for external developers.

Load only the references needed for the current task.

## Task Routing

1. Identify the dominant task type.
- `UI or app feature`: read `references/android-compose-apps.md`.
- `Library or SDK API`: read `references/kotlin-sdk-engineering.md`.
- `Build, test, release, or CI`: read `references/build-test-release.md`.
- `Unclear failure mode`: read `references/troubleshooting.md`.
2. Identify target scope early.
- `Android app`: optimize for lifecycle-aware state, Compose performance, and module boundaries.
- `Kotlin Multiplatform`: keep shared APIs in `commonMain` and isolate platform specifics.
3. Define acceptance criteria before coding.
- Define behavior, supported platforms/API levels, and compatibility expectations.
- Define required tests and release gates.
- Define doc and sample updates for developer-facing changes.

## Execution Workflow

1. Discover project shape.
- Inspect modules, dependency direction, and existing conventions before changing architecture.
- Reuse existing lint/test/build tooling instead of introducing parallel tooling.
2. Design the smallest correct change.
- Preserve local patterns unless they directly block correctness, scalability, or maintainability.
- Keep API behavior explicit, especially for nullability, threading, and error handling.
3. Implement and verify.
- Add or update tests with each behavior change.
- Run the narrowest relevant Gradle tasks first, then broader validation.
4. Finalize for maintainability.
- Update docs, samples, changelog notes, and migration guidance for API changes.
- Call out residual risks and follow-up work clearly.

## Minimum Quality Bar

- Keep modules loosely coupled and enforce dependency direction.
- Keep concurrency explicit with structured coroutines and cancellation propagation.
- Keep state transitions deterministic and testable.
- Keep APIs stable, documented, and backward-compatible unless a major version change is intended.
- Keep performance visible in hot paths (startup, recomposition-heavy screens, serialization-heavy SDK calls).
- Keep release steps reproducible in CI.

## Deliverable Patterns

- `Feature work`: include UI/state tests and architecture rationale.
- `SDK/API work`: include compatibility impact and migration notes.
- `Build/release work`: include exact commands, expected outputs, and rollback plan.

## References

- `references/android-compose-apps.md`
- `references/kotlin-sdk-engineering.md`
- `references/build-test-release.md`
- `references/troubleshooting.md`
