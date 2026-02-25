# Swift SDK Engineering

## Scope
Use this guide for Swift libraries and SDKs consumed by application developers.

## API Design Rules
- Keep public APIs minimal, coherent, and hard to misuse.
- Design around explicit optional handling and clear type ownership.
- Prefer typed result and error models over ambiguous failures.
- Keep naming consistent and task-oriented.
- Separate async and callback APIs clearly when both are offered.
- Avoid leaking transport/storage internals in public types.

## Source and ABI Compatibility
- Treat public symbols, protocol requirements, visibility, and behavior as compatibility surface.
- Avoid removing or behavior-changing public APIs in minor releases.
- Deprecate first, then remove on major versions.
- Add compatibility checks for public interfaces in CI when possible.

## Concurrency Contracts
- Document actor isolation and thread expectations for each entry point.
- Keep async APIs cancellation-cooperative.
- Prevent callback reentrancy surprises.
- Avoid hidden global mutable state.
- Keep thread safety explicit for shared clients and caches.

## Configuration and Client Lifecycle
- Use configuration or builder-style initialization.
- Validate required configuration early.
- Keep defaults safe and production-friendly.
- Expose deterministic shutdown semantics if resources are owned.
- Support dependency injection for transport, logging, and clocks.

## Error Model and Observability
- Define a stable error hierarchy with actionable fields.
- Include machine-readable codes for programmatic handling.
- Redact secrets and PII from logs and errors.
- Expose diagnostics hooks without forcing a specific logging framework.

## Packaging and Dependency Hygiene
- Minimize transitive dependencies in public SDK modules.
- Keep ABI-sensitive dependencies pinned or compatibility-tested.
- Publish with Swift Package Manager metadata that is clear and complete.
- Organize products and targets so consumers only import what they need.

## Documentation and Developer Experience
- Provide quick-start plus advanced usage.
- Include copy-pasteable snippets that compile.
- Document concurrency, retries, pagination, caching, and failure semantics.
- Ship sample apps or integration tests that mirror real usage.
- Publish migration notes for any breaking or behavior-changing release.

## SDK Testing Expectations
- Add unit tests for public behavior contracts.
- Add integration tests against representative backends or mocks.
- Add contract tests for serialization, retries, and error parsing.
- Validate sample code in CI.
