import Foundation

private var circleBoxCrashHandlerRef: CircleBoxCrashHandler?

private func circleBoxExceptionHandler(_ exception: NSException) {
    circleBoxCrashHandlerRef?.handle(exception)
}

final class CircleBoxCrashHandler {
    private var previousHandler: NSUncaughtExceptionHandler?
    private let onCrash: (String) -> Void

    init(
        onCrash: @escaping (String) -> Void,
        previousHandler: NSUncaughtExceptionHandler? = nil
    ) {
        self.onCrash = onCrash
        self.previousHandler = previousHandler
    }

    func install() {
        // Preserve any existing handler so CircleBox remains compatible with other SDKs.
        if previousHandler == nil {
            previousHandler = NSGetUncaughtExceptionHandler()
        }
        circleBoxCrashHandlerRef = self
        NSSetUncaughtExceptionHandler(circleBoxExceptionHandler)
    }

    func handle(_ exception: NSException) {
        let reason = exception.reason ?? "unknown"
        let details = "\(exception.name.rawValue):\(reason)"
        onCrash(details)
        previousHandler?(exception)
    }
}
