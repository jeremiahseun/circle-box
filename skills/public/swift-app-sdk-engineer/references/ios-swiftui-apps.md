# iOS SwiftUI Apps

## Scope
Use this guide for iOS app features, UI architecture, navigation, and performance work.

## Architecture Defaults
- Prefer modular boundaries for scale.
- Use clear layer direction: `feature -> domain -> data`.
- Keep UI as a state renderer and move business logic to view models or use-case types.
- Prefer unidirectional data flow.
- Keep public module APIs minimal and internalize implementation details.

## UI State and SwiftUI Patterns
- Model screen state as immutable value types.
- Keep state ownership explicit with `@State`, `@StateObject`, and `@ObservedObject`.
- Hoist state to the lowest common owner.
- Isolate side effects in async tasks or view models, not directly in `body`.
- Use stable identity in lists and avoid expensive work during view updates.
- Avoid tight coupling between navigation state and rendering details.

## Navigation and Feature Isolation
- Define navigation contracts at feature boundaries.
- Pass lightweight IDs instead of large objects through navigation paths.
- Resolve data in destination view models.
- Keep deep-link parsing centralized and validated.

## Data, Concurrency, and Resilience
- Expose async streams with clear ownership and cancellation behavior.
- Use structured concurrency and avoid detached work unless required.
- Propagate cancellation and timeout where operations can hang.
- Map transport errors into domain-specific user-facing states.
- Use retry/backoff only where idempotency is guaranteed.

## Performance Checklist
- Measure startup and frame timing before optimizing.
- Remove unnecessary view invalidation and identity churn.
- Offload heavy work from main actor.
- Minimize expensive layout and image decoding on critical paths.
- Profile with Instruments for CPU, memory, and rendering hotspots.

## Testing Expectations
- Add unit tests for view models and domain logic.
- Add UI tests for critical user journeys.
- Add integration tests for persistence/network boundaries when behavior changes.
- Verify lifecycle transitions and state restoration for key screens.

## Done Criteria
- Feature behavior matches acceptance criteria.
- Tests cover new logic and core regressions.
- Performance and accessibility risks are addressed or documented.
- Module boundaries remain clean.
