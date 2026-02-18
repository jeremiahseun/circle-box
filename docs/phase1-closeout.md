# CircleBox Phase 1 Closeout Checklist

This document defines the final acceptance gates for Phase 1 and the validation flow required before sign-off.

## Scope

Phase 1 is complete when both native SDKs (iOS and Android) provide:

- bounded ring-buffer capture
- crash-path pending report persistence
- next-launch pending report detection
- JSON and CSV export

Phase 2+ features are not blockers for this checklist.

## Implemented for Closeout

- iOS uncaught exception capture via `NSSetUncaughtExceptionHandler`
- iOS hard-crash signal marker capture (`SIGABRT`, `SIGSEGV`, `SIGBUS`, `SIGILL`, `SIGTRAP`, `SIGFPE`) with `sigaction`
- iOS signal recovery path using checkpoint + marker reconstruction on next launch
- iOS config toggle: `CircleBoxConfig.enableSignalCrashCapture` (default `true`)
- iOS crash-handler chaining contract tests
- iOS marker/checkpoint/recovery tests
- Android regression tests preserved for crash and pending flow
- naming guard enforcement (`scripts/check_naming.sh`)

## Automated Gates

Run all commands from the repository root:

```bash
bash scripts/check_naming.sh

cd ios/CircleBoxSDK
swift test

cd ../../android/circlebox-sdk
ANDROID_HOME=$HOME/Library/Android/sdk \
ANDROID_SDK_ROOT=$HOME/Library/Android/sdk \
./gradlew --no-daemon test
```

Required result:

- all commands exit successfully
- no naming-policy violations

## Manual Chaos Validation Gate

Manual validation is required on both platforms before release sign-off.

1. Launch chaos app.
2. Trigger at least 5 chaos/breadcrumb events.
3. Trigger hard crash path.
4. Relaunch app.
5. Verify `hasPendingCrashReport()` is `true`.
6. Export JSON and CSV.
7. Verify the export contains:
   - pre-crash chaos events in order
   - final `native_exception_prehook` crash event

For iOS, validate both:

- exception crash path (`Hard Crash`)
- signal crash path (`Signal Crash (SIGABRT)`)

## Sign-off Criteria

Phase 1 is sign-off ready only when all are true:

- iOS and Android automated gates are green
- naming guard is green
- manual chaos validation passes on both platforms
- no regressions in ring-buffer, sanitizer, and export behavior
