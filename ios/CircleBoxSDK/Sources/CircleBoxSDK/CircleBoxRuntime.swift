import Foundation

final class CircleBoxRuntime {
    private let stateQueue = DispatchQueue(label: "com.circlebox.sdk.runtime")

    private var environment = CircleBoxEnvironment.current()
    private var config: CircleBoxConfig = .default
    private var ringBuffer: CircleBoxRingBuffer<CircleBoxEvent> = CircleBoxRingBuffer(capacity: 50)
    private var fileStore = CircleBoxFileStore()
    private var monitors: CircleBoxSystemMonitors?
    private var crashHandler: CircleBoxCrashHandler?
    private var started = false

    func start(config: CircleBoxConfig) {
        // Startup is idempotent: only the first call wins.
        let shouldStart: Bool = stateQueue.sync {
            guard !started else { return false }
            started = true
            self.config = config
            environment = CircleBoxEnvironment.current()
            ringBuffer = CircleBoxRingBuffer(capacity: config.bufferCapacity)
            fileStore = CircleBoxFileStore()
            return true
        }

        guard shouldStart else { return }

        let monitors = CircleBoxSystemMonitors(config: config, fileStore: fileStore) { [weak self] type, severity, attrs, thread in
            self?.record(type: type, severity: severity, attrs: attrs, thread: thread)
        }
        monitors.start()
        self.monitors = monitors

        let crashHandler = CircleBoxCrashHandler { [weak self] details in
            self?.handleCrash(details: details)
        }
        crashHandler.install()
        self.crashHandler = crashHandler

        record(type: "sdk_start", severity: .info, attrs: ["buffer_capacity": String(config.bufferCapacity)], thread: .main)
    }

    func breadcrumb(message: String, attrs: [String: String]) {
        var final = attrs
        final["message"] = message
        record(type: "breadcrumb", severity: .info, attrs: final, thread: .main)
    }

    func exportLogs(formats: Set<CircleBoxExportFormat>) throws -> [URL] {
        // Pending crash reports (written in a previous process) take precedence.
        let envelope: CircleBoxEnvelope
        if let pending = fileStore.readPendingEnvelope() {
            envelope = pending
        } else {
            envelope = snapshotEnvelope()
        }

        var urls: [URL] = []
        let orderedFormats = CircleBoxExportFormat.allCases.filter(formats.contains)

        for format in orderedFormats {
            switch format {
            case .json:
                let data = try CircleBoxSerializer.jsonData(from: envelope)
                urls.append(try fileStore.writeExportData(data, ext: "json"))
            case .csv:
                let data = CircleBoxSerializer.csvData(from: envelope)
                urls.append(try fileStore.writeExportData(data, ext: "csv"))
            }
        }

        return urls
    }

    func hasPendingCrashReport() -> Bool {
        fileStore.hasPendingCrashReport()
    }

    func clearPendingCrashReport() throws {
        try fileStore.clearPendingCrashReport()
    }

    private func handleCrash(details: String) {
        record(
            type: "native_exception_prehook",
            severity: .fatal,
            attrs: ["details": details],
            thread: .crash
        )

        do {
            // Keep crash path best-effort and minimal: snapshot + single file write.
            let envelope = snapshotEnvelope()
            try fileStore.writePendingEnvelope(envelope)
        } catch {
            // Crash path should avoid throwing.
        }
    }

    private func snapshotEnvelope() -> CircleBoxEnvelope {
        let events = ringBuffer.snapshot()
        return CircleBoxEnvelope(
            sessionId: environment.sessionID,
            platform: environment.platform,
            appVersion: environment.appVersion,
            buildNumber: environment.buildNumber,
            osVersion: environment.osVersion,
            deviceModel: environment.deviceModel,
            generatedAtUnixMs: Self.nowMs(),
            events: events
        )
    }

    private func record(
        type: String,
        severity: CircleBoxEventSeverity,
        attrs: [String: String],
        thread: CircleBoxEventThread
    ) {
        let activeConfig = stateQueue.sync { config }
        let sanitizedAttrs = CircleBoxSanitizer.sanitize(attrs: attrs, config: activeConfig)

        ringBuffer.append { seq in
            CircleBoxEvent(
                seq: seq,
                timestampUnixMs: Self.nowMs(),
                uptimeMs: Self.uptimeMs(),
                type: type,
                thread: thread,
                severity: severity,
                attrs: sanitizedAttrs
            )
        }
    }

    private static func nowMs() -> Int64 {
        Int64(Date().timeIntervalSince1970 * 1000)
    }

    private static func uptimeMs() -> Int64 {
        Int64(ProcessInfo.processInfo.systemUptime * 1000)
    }
}
