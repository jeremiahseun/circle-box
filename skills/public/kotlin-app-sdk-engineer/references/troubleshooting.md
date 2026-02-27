# Troubleshooting

## Scope
Use this guide when failures are unclear, flaky, or cross-cutting.

## Rapid Triage
1. Reproduce deterministically.
- Capture exact command, module, and environment.
- Disable unrelated parallel work when isolating flaky behavior.
2. Localize the failure.
- Distinguish compile, test, runtime, and release-pipeline failures.
- Identify the first failing module/task, not only the final summary error.
3. Minimize the surface area.
- Create a small reproducer in the target module.
- Remove optional features/flags until root cause appears.

## Common Build Failures
- `Kotlin/AGP version mismatch`: align plugin and stdlib versions across modules.
- `Configuration cache issues`: isolate plugins/tasks that are not cache-safe.
- `Dependency conflicts`: inspect with `./gradlew :module:dependencies` and align versions.
- `KSP/KAPT issues`: clean generated sources, verify processor version compatibility.

## Common Runtime and UI Failures
- `Lifecycle leaks`: verify collector scope and cancellation behavior.
- `Recomposition spikes`: inspect unstable parameters and state churn.
- `ANR/jank`: move blocking work off main thread and profile long frames.
- `Navigation crashes`: validate route args and deep-link parsing.

## Common SDK Failures
- `Ambiguous error mapping`: normalize transport errors to stable SDK error types.
- `Thread-safety races`: audit shared mutable state and callback ordering.
- `Serialization drift`: add contract tests for backward/forward payload compatibility.
- `Consumer breakages`: verify binary/source compatibility before release.

## Debugging Commands
- `./gradlew --stacktrace :module:task`
- `./gradlew --info :module:test`
- `./gradlew :module:dependencies`
- `./gradlew :sdk:publishToMavenLocal`

## Exit Criteria
- Root cause is documented with proof.
- Fix includes regression tests.
- Risky follow-up work is listed with ownership and scope.
