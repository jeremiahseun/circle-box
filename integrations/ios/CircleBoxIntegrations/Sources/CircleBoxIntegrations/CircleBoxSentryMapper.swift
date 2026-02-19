import Foundation

public enum CircleBoxSentryMapper {
    public static func breadcrumbs(from envelope: CircleBoxAdapterEnvelope) -> [CircleBoxSentryBreadcrumb] {
        envelope.events.map { event in
            CircleBoxSentryBreadcrumb(
                category: event.type,
                level: level(for: event.severity),
                message: event.attrs["message"] ?? event.type,
                timestampUnixMs: event.timestampUnixMs,
                data: ["thread": event.thread, "severity": event.severity].merging(event.attrs) { current, _ in current }
            )
        }
    }

    private static func level(for severity: String) -> String {
        switch severity {
        case "fatal":
            return "fatal"
        case "error":
            return "error"
        case "warn":
            return "warning"
        default:
            return "info"
        }
    }
}
