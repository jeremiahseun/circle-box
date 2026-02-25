# Troubleshooting

## Scope
Use this guide when failures are unclear, flaky, or cross-cutting.

## Rapid Triage
1. Reproduce deterministically.
- Capture exact command, target, scheme, and environment.
- Disable unrelated parallel work when isolating flaky behavior.
2. Localize the failure.
- Distinguish compile, test, runtime, and release-pipeline failures.
- Identify the first failing target/task, not only the final summary error.
3. Minimize the surface area.
- Create a small reproducer in the target module.
- Remove optional features/flags until root cause appears.

## Common Build Failures
- `Toolchain mismatch`: align Xcode and Swift tools versions.
- `Package resolution drift`: reset resolved dependencies and re-resolve.
- `Module import failures`: verify target membership and product exposure.
- `Signing/provisioning failures`: separate build validation from signing requirements.

## Common Runtime and UI Failures
- `Main actor violations`: enforce actor boundaries and isolate UI updates.
- `View update churn`: inspect identity and state ownership.
- `Memory leaks`: inspect retain cycles in closures, tasks, and delegates.
- `Navigation crashes`: validate path state and deep-link parsing.

## Common SDK Failures
- `Ambiguous error mapping`: normalize transport errors to stable SDK error types.
- `Concurrency races`: audit shared mutable state and callback ordering.
- `Serialization drift`: add contract tests for backward/forward payload compatibility.
- `Consumer breakages`: verify API compatibility before release.

## Debugging Commands
- `swift test --package-path <path>`
- `swift test --package-path <path> --filter <TestName>`
- `xcodebuild test -scheme <scheme> -destination 'platform=iOS Simulator,name=iPhone 16'`
- `xcodebuild build -scheme <scheme> -configuration Release`

## Exit Criteria
- Root cause is documented with proof.
- Fix includes regression tests.
- Risky follow-up work is listed with ownership and scope.
