import Foundation

public enum CircleBoxSentryMapper {
    public static func breadcrumbs(from envelope: CircleBoxAdapterEnvelope) -> [CircleBoxSentryBreadcrumb] {
        envelope.events.map { event in
            breadcrumb(from: event, sdk: "ios", mode: "export_adapter")
        }
    }

    public static func breadcrumb(
        from event: CircleBoxAdapterEvent,
        sdk: String = "ios",
        mode: String = "realtime_adapter"
    ) -> CircleBoxSentryBreadcrumb {
        CircleBoxSentryBreadcrumb(
            category: "circlebox.\(event.type)",
            level: level(for: event.severity),
            message: event.attrs["message"] ?? event.type,
            timestampUnixMs: event.timestampUnixMs,
            data: [
                "thread": event.thread,
                "severity": event.severity,
                "circlebox_source": "circlebox",
                "circlebox_mode": mode,
                "circlebox_sdk": sdk
            ].merging(event.attrs) { current, _ in current }
        )
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
