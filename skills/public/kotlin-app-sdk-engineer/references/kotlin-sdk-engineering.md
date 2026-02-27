# Kotlin SDK Engineering

## Scope
Use this guide for Kotlin libraries and SDKs consumed by application developers.

## API Design Rules
- Keep public APIs minimal, coherent, and hard to misuse.
- Design around explicit nullability and clear type ownership.
- Prefer sealed result/error models over ambiguous exceptions for expected failures.
- Keep naming consistent and task-oriented.
- Separate sync-looking and async APIs clearly.
- Avoid leaking transport/storage internals in public types.

## Binary and Source Compatibility
- Treat public classes, method signatures, default parameters, and visibility as compatibility surface.
- Avoid removing or changing behavior of public APIs in minor releases.
- Deprecate first, then remove on major versions.
- Add compatibility checks in CI for published artifacts when available.

## Threading and Coroutine Contracts
- Document dispatcher expectations for each entry point.
- Keep suspend APIs cancellation-cooperative.
- Prevent callback reentrancy surprises.
- Avoid hidden global mutable state.
- Keep thread safety explicit for shared clients and caches.

## Configuration and Client Lifecycle
- Use builder/config objects for initialization.
- Validate required configuration early.
- Keep defaults safe and production-friendly.
- Expose deterministic shutdown/close semantics if resources are owned.
- Support dependency injection for HTTP/logging/time to improve testability.

## Error Model and Observability
- Define a stable error hierarchy with actionable fields.
- Include machine-readable codes for programmatic handling.
- Redact secrets/PII from logs and exceptions.
- Expose diagnostics hooks without forcing a logging framework.

## Packaging and Dependency Hygiene
- Minimize transitive dependencies in public SDK modules.
- Shade/relocate only when unavoidable and document consequences.
- Keep ABI-sensitive dependencies pinned or compatibility-tested.
- Publish variant-aware artifacts only when consumers need them.

## Documentation and Developer Experience
- Provide quick-start plus advanced usage.
- Include copy-pasteable snippets that compile.
- Document threading, retries, pagination, caching, and failure semantics.
- Ship sample apps or integration tests that mirror real usage.
- Publish migration notes for any breaking or behavior-changing release.

## SDK Testing Expectations
- Add unit tests for public behavior contracts.
- Add integration tests against representative backends/mocks.
- Add contract tests for serialization, pagination, retries, and error parsing.
- Add compatibility tests for backward/forward schema interactions where relevant.
- Validate sample code in CI.
