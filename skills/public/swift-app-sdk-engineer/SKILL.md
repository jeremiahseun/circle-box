---
name: swift-app-sdk-engineer
description: Build, refactor, test, and release Swift software for iOS apps and reusable SDKs. Use when tasks involve Swift and Xcode or SwiftPM projects, SwiftUI interface development, app architecture, Swift Concurrency state management, modularization, performance tuning, framework or SDK API design, compatibility management, Swift Package distribution, or developer-facing documentation and samples.
---

# Swift App Sdk Engineer

## Overview

Build production Swift systems across two tracks:
1. Ship scalable Apple-platform apps with reliable UI architecture.
2. Ship stable Swift libraries and SDKs for external developers.

Load only the references needed for the current task.

## Task Routing

1. Identify the dominant task type.
- `UI or app feature`: read `references/ios-swiftui-apps.md`.
- `Library or SDK API`: read `references/swift-sdk-engineering.md`.
- `Build, test, release, or CI`: read `references/build-test-release.md`.
- `Unclear failure mode`: read `references/troubleshooting.md`.
2. Identify target scope early.
- `iOS app`: optimize for lifecycle-aware state, SwiftUI rendering behavior, and module boundaries.
- `Cross-platform Apple targets`: keep shared code in packages and isolate platform-specific adapters.
3. Define acceptance criteria before coding.
- Define behavior, minimum OS versions, and compatibility expectations.
- Define required tests and release gates.
- Define doc and sample updates for developer-facing changes.

## Execution Workflow

1. Discover project shape.
- Inspect package targets, app modules, and existing conventions before changing architecture.
- Reuse existing lint/test/build tooling instead of introducing parallel tooling.
2. Design the smallest correct change.
- Preserve local patterns unless they directly block correctness, scalability, or maintainability.
- Keep API behavior explicit, especially for optionality, actor isolation, and error contracts.
3. Implement and verify.
- Add or update tests with each behavior change.
- Run the narrowest relevant `swift test` or `xcodebuild` tasks first, then broader validation.
4. Finalize for maintainability.
- Update docs, samples, release notes, and migration guidance for API changes.
- Call out residual risks and follow-up work clearly.

## Minimum Quality Bar

- Keep modules loosely coupled and enforce dependency direction.
- Keep concurrency explicit with `async/await`, structured tasks, and cancellation propagation.
- Keep state transitions deterministic and testable.
- Keep APIs stable, documented, and backward-compatible unless a major version change is intended.
- Keep performance visible in hot paths (startup, rendering-heavy views, serialization-heavy SDK calls).
- Keep release steps reproducible in CI.

## Deliverable Patterns

- `Feature work`: include UI/state tests and architecture rationale.
- `SDK/API work`: include compatibility impact and migration notes.
- `Build/release work`: include exact commands, expected outputs, and rollback plan.

## References

- `references/ios-swiftui-apps.md`
- `references/swift-sdk-engineering.md`
- `references/build-test-release.md`
- `references/troubleshooting.md`
