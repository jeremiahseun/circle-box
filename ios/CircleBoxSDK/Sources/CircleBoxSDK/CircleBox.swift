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

    /// Records a screen view event into the ring buffer.
    ///
    /// Call this whenever the user navigates to a new screen so the crash
    /// timeline shows which view was active before the crash.
    ///
    /// - Parameters:
    ///   - name: Screen or view controller name (e.g. `"HomeScreen"`).
    ///   - attrs: Optional additional context.
    public static func screenView(_ name: String, attrs: [String: String] = [:]) {
        runtime.screenView(name: name, attrs: attrs)
    }

    /// Records a user interaction event into the ring buffer.
    ///
    /// Use this for high-signal actions such as button taps, form submissions,
    /// or gesture recognitions so the crash timeline captures what the user did
    /// immediately before the failure.
    ///
    /// - Parameters:
    ///   - actionType: Category of the action (e.g. `"tap"`, `"swipe"`, `"submit"`).
    ///   - target: Identifier of the element acted upon (e.g. `"LoginButton"`).
    ///   - attrs: Optional additional context.
    public static func userAction(_ actionType: String, target: String, attrs: [String: String] = [:]) {
        runtime.userAction(actionType: actionType, target: target, attrs: attrs)
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

    /// Returns a debug snapshot of the latest in-memory ring buffer events.
    ///
    /// This returns an empty list unless `enableDebugViewer` is enabled in config.
    public static func debugSnapshot(maxEvents: Int = 200) -> [CircleBoxEvent] {
        runtime.debugSnapshot(maxEvents: maxEvents)
    }

    /// Registers a non-blocking observer for realtime CircleBox events.
    ///
    /// Returns a token that can be passed to `removeEventObserver`.
    @discardableResult
    public static func addEventObserver(_ observer: @escaping (CircleBoxEvent) -> Void) -> UUID {
        runtime.addEventObserver(observer)
    }

    /// Removes a previously registered realtime event observer.
    public static func removeEventObserver(_ token: UUID) {
        runtime.removeEventObserver(token)
    }
}
