# Android Compose Apps

## Scope
Use this guide for Android application features, UI architecture, navigation, and performance work.

## Architecture Defaults
- Prefer multi-module boundaries for scale.
- Use clear layer direction: `feature -> domain -> data`.
- Keep UI as a state renderer and move business logic to ViewModels or use-case classes.
- Prefer unidirectional data flow.
- Keep public module APIs minimal and internalize implementation details.

## UI State and Compose Patterns
- Model screen state as immutable data classes.
- Use `StateFlow` in ViewModel and collect with lifecycle-aware APIs.
- Hoist state to the lowest common owner.
- Keep Composables side-effect free; isolate side effects in `LaunchedEffect` or ViewModel.
- Use `rememberSaveable` for user-critical transient UI state.
- Keep list item keys stable and avoid expensive work during recomposition.
- Mark models as stable when appropriate and avoid passing mutable collections directly.

## Navigation and Feature Isolation
- Define navigation contracts at feature boundaries.
- Pass lightweight IDs instead of large objects through routes.
- Resolve data in destination ViewModels.
- Keep deep-link parsing centralized and validated.

## Data, Concurrency, and Resilience
- Expose streams as `Flow` and convert to UI state in ViewModel.
- Use structured concurrency and avoid `GlobalScope`.
- Propagate cancellation and timeout where operations can hang.
- Map transport errors into domain-specific, user-facing states.
- Use retry/backoff only where idempotency is guaranteed.

## Performance Checklist
- Measure startup and frame timing before optimizing.
- Remove recomposition churn caused by unstable parameters.
- Cache expensive derived values with `derivedStateOf` when needed.
- Offload heavy work from main thread.
- Use baseline profiles and macrobenchmarks for startup and scroll-sensitive screens.

## Testing Expectations
- Add unit tests for reducers/ViewModels and domain logic.
- Add Compose UI tests for critical user journeys.
- Add integration tests for persistence/network boundaries when behavior changes.
- Verify configuration change and process recreation behavior for key screens.

## Done Criteria
- Feature behavior matches acceptance criteria.
- Tests cover new logic and core regressions.
- Performance and accessibility risks are addressed or documented.
- Module boundaries remain clean.
