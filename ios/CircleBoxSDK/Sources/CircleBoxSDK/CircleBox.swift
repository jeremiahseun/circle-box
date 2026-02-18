import Foundation

/// Public entrypoint for the CircleBox iOS SDK.
///
/// Call `start` once during app launch, then add breadcrumbs where useful.
public enum CircleBox {
    private static let runtime = CircleBoxRuntime()

    /// Starts CircleBox with the provided configuration.
    ///
    /// Repeated calls after the first one are ignored.
    public static func start(config: CircleBoxConfig = .default) {
        runtime.start(config: config)
    }

    /// Adds a custom breadcrumb to the ring buffer.
    ///
    /// - Parameters:
    ///   - message: Human-readable breadcrumb message.
    ///   - attrs: Optional structured context.
    public static func breadcrumb(_ message: String, attrs: [String: String] = [:]) {
        runtime.breadcrumb(message: message, attrs: attrs)
    }

    /// Exports the latest report in the requested formats and returns file URLs.
    ///
    /// If a pending crash report exists from a previous launch, that report is exported.
    public static func exportLogs(formats: Set<CircleBoxExportFormat> = [.json, .csv]) throws -> [URL] {
        try runtime.exportLogs(formats: formats)
    }

    /// Returns `true` when a crash report from a previous process run exists.
    public static func hasPendingCrashReport() -> Bool {
        runtime.hasPendingCrashReport()
    }

    /// Deletes the pending crash report, if present.
    public static func clearPendingCrashReport() throws {
        try runtime.clearPendingCrashReport()
    }
}
