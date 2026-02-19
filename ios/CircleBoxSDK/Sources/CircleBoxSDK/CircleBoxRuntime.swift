import Foundation

final class CircleBoxRuntime {
    private let stateQueue = DispatchQueue(label: "com.circlebox.sdk.runtime")
    private let fileStore: CircleBoxFileStore
    private let environmentProvider: () -> CircleBoxEnvironment

    private var environment: CircleBoxEnvironment
    private var config: CircleBoxConfig = .default
    private var ringBuffer: CircleBoxRingBuffer<CircleBoxEvent> = CircleBoxRingBuffer(capacity: 50)
    private var monitors: CircleBoxSystemMonitors?
    private var crashHandler: CircleBoxCrashHandler?
    private var signalCrashHandler: CircleBoxSignalCrashHandler?
    private var started = false

    init(
        fileStore: CircleBoxFileStore = CircleBoxFileStore(),
        environmentProvider: @escaping () -> CircleBoxEnvironment = CircleBoxEnvironment.current
    ) {
        self.fileStore = fileStore
        self.environmentProvider = environmentProvider
        self.environment = environmentProvider()
    }

    func start(config: CircleBoxConfig) {
        // Startup is idempotent: only the first call wins.
        let shouldStart: Bool = stateQueue.sync {
            guard !started else { return false }
            started = true
            self.config = config
            environment = environmentProvider()
            ringBuffer = CircleBoxRingBuffer(capacity: config.bufferCapacity)
            return true
        }

        guard shouldStart else { return }

        recoverPendingFromSignalMarkerIfNeeded()

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

        if config.enableSignalCrashCapture,
           let markerPath = fileStore.signalMarkerPathCString(),
           let signalCrashHandler = CircleBoxSignalCrashHandler(markerPath: markerPath) {
            signalCrashHandler.install()
            self.signalCrashHandler = signalCrashHandler
        }

        record(type: "sdk_start", severity: .info, attrs: ["buffer_capacity": String(config.bufferCapacity)], thread: .main)
        writeCheckpointBestEffort()
    }

    func breadcrumb(message: String, attrs: [String: String]) {
        var final = attrs
        final["message"] = message
        record(type: "breadcrumb", severity: .info, attrs: final, thread: .main)
    }

    func exportLogs(formats: Set<CircleBoxExportFormat>) throws -> [URL] {
        // Pending crash reports (written in a previous process) take precedence.
        let pendingEnvelope = fileStore.readPendingEnvelope()
        let contextDefaults: (CircleBoxExportSource, CircleBoxCaptureReason) = pendingEnvelope == nil
            ? (.liveSnapshot, .manualExport)
            : (.pendingCrash, .startupPendingDetection)
        let envelope = normalizedEnvelope(
            pendingEnvelope ?? snapshotEnvelope(exportSource: .liveSnapshot, captureReason: .manualExport),
            fallbackExportSource: contextDefaults.0,
            fallbackCaptureReason: contextDefaults.1
        )

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
            case .jsonGzip:
                let data = try CircleBoxSerializer.jsonData(from: envelope)
                let compressed = try CircleBoxSerializer.gzipData(data)
                urls.append(try fileStore.writeExportData(compressed, ext: "json.gz"))
            case .csvGzip:
                let data = CircleBoxSerializer.csvData(from: envelope)
                let compressed = try CircleBoxSerializer.gzipData(data)
                urls.append(try fileStore.writeExportData(compressed, ext: "csv.gz"))
            case .summary:
                let data = try CircleBoxSerializer.summaryData(from: envelope, exportSource: envelope.exportSource.rawValue)
                urls.append(try fileStore.writeExportData(data, ext: "summary.json"))
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

    func debugSnapshot(maxEvents: Int = 200) -> [CircleBoxEvent] {
        let localConfig = stateQueue.sync { config }
        guard localConfig.enableDebugViewer else {
            return []
        }

        let events = ringBuffer.snapshot()
        let clamped = max(1, maxEvents)
        return Array(events.suffix(clamped))
    }

    func recoverPendingFromSignalMarkerIfNeeded() {
        if fileStore.hasPendingCrashReport() {
            try? fileStore.clearSignalMarker()
            return
        }

        guard let marker = fileStore.readSignalMarker() else {
            return
        }
        defer { try? fileStore.clearSignalMarker() }

        let baseEnvelope = fileStore.readCheckpointEnvelope() ?? snapshotEnvelope()
        let nextSeq = (baseEnvelope.events.last?.seq ?? -1) + 1
        let crashEvent = CircleBoxEvent(
            seq: nextSeq,
            timestampUnixMs: marker.timestampUnixMs,
            uptimeMs: Self.uptimeMs(),
            type: "native_exception_prehook",
            thread: .crash,
            severity: .fatal,
            attrs: [
                "signal": marker.name,
                "signal_number": String(marker.signal),
                "details": "signal:\(marker.name)(\(marker.signal))"
            ]
        )

        let recoveredEnvelope = CircleBoxEnvelope(
            schemaVersion: max(baseEnvelope.schemaVersion, 2),
            sessionId: baseEnvelope.sessionId,
            platform: baseEnvelope.platform,
            appVersion: baseEnvelope.appVersion,
            buildNumber: baseEnvelope.buildNumber,
            osVersion: baseEnvelope.osVersion,
            deviceModel: baseEnvelope.deviceModel,
            exportSource: .pendingCrash,
            captureReason: .startupPendingDetection,
            generatedAtUnixMs: Self.nowMs(),
            events: baseEnvelope.events + [crashEvent]
        )

        do {
            try fileStore.writePendingEnvelope(recoveredEnvelope)
            try? fileStore.clearCheckpointEnvelope()
        } catch {
            // Recovery must never interrupt SDK startup.
        }
    }

    private func handleCrash(details: String) {
        record(
            type: "native_exception_prehook",
            severity: .fatal,
            attrs: ["details": details],
            thread: .crash,
            persistCheckpoint: false
        )

        do {
            // Keep crash path best-effort and minimal: snapshot + single file write.
            let envelope = snapshotEnvelope(exportSource: .pendingCrash, captureReason: .uncaughtException)
            try fileStore.writePendingEnvelope(envelope)
            try? fileStore.clearSignalMarker()
        } catch {
            // Crash path should avoid throwing.
        }
    }

    private func snapshotEnvelope(
        exportSource: CircleBoxExportSource = .liveSnapshot,
        captureReason: CircleBoxCaptureReason = .manualExport
    ) -> CircleBoxEnvelope {
        let events = ringBuffer.snapshot()
        return CircleBoxEnvelope(
            sessionId: environment.sessionID,
            platform: environment.platform,
            appVersion: environment.appVersion,
            buildNumber: environment.buildNumber,
            osVersion: environment.osVersion,
            deviceModel: environment.deviceModel,
            exportSource: exportSource,
            captureReason: captureReason,
            generatedAtUnixMs: Self.nowMs(),
            events: events
        )
    }

    private func normalizedEnvelope(
        _ envelope: CircleBoxEnvelope,
        fallbackExportSource: CircleBoxExportSource,
        fallbackCaptureReason: CircleBoxCaptureReason
    ) -> CircleBoxEnvelope {
        let source = envelope.schemaVersion < 2 ? fallbackExportSource : envelope.exportSource
        let reason = envelope.schemaVersion < 2 ? fallbackCaptureReason : envelope.captureReason

        return CircleBoxEnvelope(
            schemaVersion: max(envelope.schemaVersion, 2),
            sessionId: envelope.sessionId,
            platform: envelope.platform,
            appVersion: envelope.appVersion,
            buildNumber: envelope.buildNumber,
            osVersion: envelope.osVersion,
            deviceModel: envelope.deviceModel,
            exportSource: source,
            captureReason: reason,
            generatedAtUnixMs: envelope.generatedAtUnixMs,
            events: envelope.events
        )
    }

    private func record(
        type: String,
        severity: CircleBoxEventSeverity,
        attrs: [String: String],
        thread: CircleBoxEventThread,
        persistCheckpoint: Bool = true
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

        if persistCheckpoint {
            writeCheckpointBestEffort()
        }
    }

    private func writeCheckpointBestEffort() {
        do {
            try fileStore.writeCheckpointEnvelope(snapshotEnvelope())
        } catch {
            // Checkpoint writes are best-effort and should not affect runtime behavior.
        }
    }

    private static func nowMs() -> Int64 {
        Int64(Date().timeIntervalSince1970 * 1000)
    }

    private static func uptimeMs() -> Int64 {
        Int64(ProcessInfo.processInfo.systemUptime * 1000)
    }
}
