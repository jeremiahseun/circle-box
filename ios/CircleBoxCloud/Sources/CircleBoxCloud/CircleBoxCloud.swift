import Foundation
import CryptoKit
import CircleBoxSDK

#if canImport(UIKit)
import UIKit
#endif

public enum CircleBoxCloudUsageMode: String, Sendable {
    case offlineOnly = "offline_only"
    case coreCloud = "core_cloud"
    case coreAdapters = "core_adapters"
    case coreCloudAdapters = "core_cloud_adapters"
    case selfHost = "self_host"
}

public struct CircleBoxCloudConfig: Sendable {
    public let endpoint: URL
    public let ingestKey: String
    public let region: String
    public let enableFragmentSync: Bool
    public let flushIntervalSec: TimeInterval
    public let maxQueueMB: Int
    public let wifiOnly: Bool
    public let retryMaxBackoffSec: TimeInterval
    public let enableAutoFlush: Bool
    public let autoExportPendingOnStart: Bool
    public let immediateFlushOnHighSignal: Bool
    public let enableUsageBeacon: Bool
    public let usageBeaconKey: String?
    public let usageBeaconEndpoint: URL?
    public let usageBeaconMode: CircleBoxCloudUsageMode
    public let usageBeaconMinIntervalSec: TimeInterval

    public init(
        endpoint: URL,
        ingestKey: String,
        region: String = "auto",
        enableFragmentSync: Bool = true,
        flushIntervalSec: TimeInterval = 15,
        maxQueueMB: Int = 20,
        wifiOnly: Bool = false,
        retryMaxBackoffSec: TimeInterval = 900,
        enableAutoFlush: Bool = true,
        autoExportPendingOnStart: Bool = true,
        immediateFlushOnHighSignal: Bool = true,
        enableUsageBeacon: Bool = false,
        usageBeaconKey: String? = nil,
        usageBeaconEndpoint: URL? = nil,
        usageBeaconMode: CircleBoxCloudUsageMode = .coreCloud,
        usageBeaconMinIntervalSec: TimeInterval = 300
    ) {
        let trimmedIngestKey = ingestKey.trimmingCharacters(in: .whitespacesAndNewlines)
        precondition(trimmedIngestKey.hasPrefix("cb_live_"), "ingestKey must use cb_live_ prefix")
        let trimmedUsageKey = usageBeaconKey?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let trimmedUsageKey, !trimmedUsageKey.isEmpty {
            precondition(trimmedUsageKey.hasPrefix("cb_usage_"), "usageBeaconKey must use cb_usage_ prefix")
        }
        if let usageBeaconEndpoint {
            let lower = usageBeaconEndpoint.absoluteString.lowercased()
            precondition(lower.hasPrefix("http://") || lower.hasPrefix("https://"), "usageBeaconEndpoint must be http(s)")
        }

        self.endpoint = endpoint
        self.ingestKey = trimmedIngestKey
        self.region = region
        self.enableFragmentSync = enableFragmentSync
        self.flushIntervalSec = max(10, flushIntervalSec)
        self.maxQueueMB = max(1, maxQueueMB)
        self.wifiOnly = wifiOnly
        self.retryMaxBackoffSec = max(30, retryMaxBackoffSec)
        self.enableAutoFlush = enableAutoFlush
        self.autoExportPendingOnStart = autoExportPendingOnStart
        self.immediateFlushOnHighSignal = immediateFlushOnHighSignal
        self.enableUsageBeacon = enableUsageBeacon
        self.usageBeaconKey = trimmedUsageKey
        self.usageBeaconEndpoint = usageBeaconEndpoint
        self.usageBeaconMode = usageBeaconMode
        self.usageBeaconMinIntervalSec = max(30, usageBeaconMinIntervalSec)
    }
}

private struct CircleBoxCloudUploadTask: Codable, Sendable {
    let id: String
    let endpointPath: String
    let filePath: String
    let contentType: String
    let idempotencyKey: String
    let payloadBytes: Int
    let createdUnixMs: Int64
    var attempts: Int
    var nextAttemptUnixMs: Int64
}

private enum CircleBoxCloudUploadOutcome {
    case success
    case retryable
    case permanent
}

private struct CircleBoxCloudUsageBeaconState: Codable, Sendable {
    var usageDate: String
    var activeApps: Int64
    var crashReports: Int64
    var eventsEmitted: Int64
    var lastSentUnixMs: Int64

    enum CodingKeys: String, CodingKey {
        case usageDate = "usage_date"
        case activeApps = "active_apps"
        case crashReports = "crash_reports"
        case eventsEmitted = "events_emitted"
        case lastSentUnixMs = "last_sent_unix_ms"
    }
}

private struct CircleBoxCloudUsageSummaryIncrement: Sendable {
    let crashReports: Int64
    let eventsEmitted: Int64
}

public enum CircleBoxCloud {
    private static let sdkVersion = "0.3.1"
    private static let stateQueue = DispatchQueue(label: "com.circlebox.cloud.uploader.state")
    private static var config: CircleBoxCloudConfig?
    private static var paused = false
    private static var uploadQueue: [CircleBoxCloudUploadTask] = []
    private static var queueLoaded = false
    private static var isProcessingQueue = false
    private static var usageBeaconStateLoaded = false
    private static var usageBeaconState: CircleBoxCloudUsageBeaconState?
    private static var isSendingUsageBeacon = false
    private static var autoFlushTimer: DispatchSourceTimer?
    private static var highSignalObserverToken: UUID?
    private static var lastImmediateFlushUnixMs: Int64 = 0
    private static var isAppActive = true

    #if canImport(UIKit)
    private static var didBecomeActiveObserver: NSObjectProtocol?
    private static var willResignActiveObserver: NSObjectProtocol?
    #endif

    public static func start(config: CircleBoxCloudConfig) {
        stateQueue.sync {
            self.config = config
            self.paused = false
            try? ensureQueueLoadedLocked()
            try? ensureUsageBeaconStateLoadedLocked()
            recordUsageAppStartLocked()
            try? persistUsageBeaconStateLocked()
            updateForegroundStateLocked()
            configureAutoFlushLocked()
            configureHighSignalFlushObserverLocked()
        }

        Task {
            await handleForegroundDrain(checkPendingCrash: config.autoExportPendingOnStart)
        }
    }

    public static func pause() {
        stateQueue.sync {
            paused = true
            stopAutoFlushTimerLocked()
        }
    }

    public static func resume() {
        stateQueue.sync {
            paused = false
            updateForegroundStateLocked()
            configureAutoFlushLocked()
        }

        Task {
            await handleForegroundDrain(checkPendingCrash: true)
        }
    }

    public static func setUser(id: String, attrs: [String: String] = [:]) {
        var eventAttrs = attrs
        eventAttrs["user_id"] = id
        CircleBox.breadcrumb("cloud_user_context", attrs: eventAttrs)
    }

    public static func captureAction(name: String, attrs: [String: String] = [:]) {
        var eventAttrs = attrs
        eventAttrs["action_name"] = name
        CircleBox.breadcrumb("ui_action", attrs: eventAttrs)
    }

    @discardableResult
    public static func flush() async throws -> [URL] {
        let localConfig = stateQueue.sync { config }
        guard let localConfig else {
            throw NSError(domain: "CircleBoxCloud", code: 1, userInfo: [NSLocalizedDescriptionKey: "CircleBoxCloud not started"])
        }

        let isPaused = stateQueue.sync { paused }
        guard !isPaused else { return [] }

        let files = try CircleBox.exportLogs(formats: [.summary, .jsonGzip])
        try stateQueue.sync {
            try ensureQueueLoadedLocked()
            try enqueueFilesLocked(files: files, config: localConfig)
            try persistQueueLocked()
        }
        await processQueueIfNeeded()

        return files
    }

    private static func handleForegroundDrain(checkPendingCrash: Bool) async {
        guard let localConfig = stateQueue.sync(execute: { config }) else { return }
        guard !stateQueue.sync(execute: { paused }) else { return }

        if checkPendingCrash && CircleBox.hasPendingCrashReport() {
            _ = try? await flush()
            await sendUsageBeaconIfNeeded(force: false)
            return
        }

        if localConfig.enableAutoFlush {
            await processQueueIfNeeded()
        }
        await sendUsageBeaconIfNeeded(force: false)
    }

    private static func processQueueIfNeeded() async {
        let localConfig = stateQueue.sync { config }
        guard let localConfig else { return }

        let shouldProcess = stateQueue.sync { () -> Bool in
            if isProcessingQueue {
                return false
            }
            isProcessingQueue = true
            return true
        }
        guard shouldProcess else { return }
        defer {
            stateQueue.sync {
                isProcessingQueue = false
            }
        }

        let session = URLSession(configuration: .ephemeral)
        while true {
            if stateQueue.sync(execute: { paused }) {
                break
            }

            guard let task = stateQueue.sync(execute: { nextReadyTaskLocked() }) else {
                break
            }

            let fileURL = URL(fileURLWithPath: task.filePath)
            guard let payload = try? Data(contentsOf: fileURL) else {
                stateQueue.sync {
                    removeTaskLocked(id: task.id)
                    try? persistQueueLocked()
                }
                continue
            }

            let summaryIncrement = task.endpointPath == "v1/ingest/fragment"
                ? parseUsageSummaryIncrement(from: payload)
                : nil

            let outcome = await uploadOnce(
                session: session,
                config: localConfig,
                task: task,
                payload: payload
            )

            stateQueue.sync {
                switch outcome {
                case .success:
                    removeTaskLocked(id: task.id)
                    if let summaryIncrement {
                        applyUsageSummaryIncrementLocked(summaryIncrement)
                    }
                case .retryable:
                    rescheduleTaskLocked(id: task.id, retryMaxBackoffSec: localConfig.retryMaxBackoffSec)
                case .permanent:
                    removeTaskLocked(id: task.id)
                }
                try? persistQueueLocked()
                if case .success = outcome, summaryIncrement != nil {
                    try? persistUsageBeaconStateLocked()
                }
            }

            if case .success = outcome, summaryIncrement != nil {
                await sendUsageBeaconIfNeeded(force: false)
            }
        }
    }

    private static func configureAutoFlushLocked() {
        registerLifecycleObserversLocked()

        guard let localConfig = config else {
            stopAutoFlushTimerLocked()
            return
        }
        guard localConfig.enableAutoFlush, !paused, isAppActive else {
            stopAutoFlushTimerLocked()
            return
        }
        guard autoFlushTimer == nil else { return }

        let timer = DispatchSource.makeTimerSource(queue: stateQueue)
        timer.schedule(deadline: .now() + localConfig.flushIntervalSec, repeating: localConfig.flushIntervalSec)
        timer.setEventHandler {
            Task {
                await processQueueIfNeeded()
            }
        }
        timer.resume()
        autoFlushTimer = timer
    }

    private static func configureHighSignalFlushObserverLocked() {
        guard let localConfig = config else {
            removeHighSignalObserverLocked()
            return
        }
        guard localConfig.immediateFlushOnHighSignal else {
            removeHighSignalObserverLocked()
            return
        }
        guard highSignalObserverToken == nil else { return }

        highSignalObserverToken = CircleBox.addEventObserver { event in
            stateQueue.async {
                requestImmediateFlushIfNeededLocked(for: event)
            }
        }
    }

    private static func removeHighSignalObserverLocked() {
        guard let token = highSignalObserverToken else { return }
        CircleBox.removeEventObserver(token)
        highSignalObserverToken = nil
    }

    private static func requestImmediateFlushIfNeededLocked(for event: CircleBoxEvent) {
        guard let localConfig = config else { return }
        guard localConfig.immediateFlushOnHighSignal else { return }
        guard !paused else { return }
        guard isHighSignalEvent(event) else { return }

        let now = nowMs()
        if now - lastImmediateFlushUnixMs < 2_000 {
            return
        }
        lastImmediateFlushUnixMs = now

        Task {
            _ = try? await flush()
            await sendUsageBeaconIfNeeded(force: false)
        }
    }

    private static func isHighSignalEvent(_ event: CircleBoxEvent) -> Bool {
        if event.type == "native_exception_prehook" {
            return true
        }
        return event.severity == .error || event.severity == .fatal
    }

    private static func stopAutoFlushTimerLocked() {
        guard let timer = autoFlushTimer else { return }
        timer.cancel()
        autoFlushTimer = nil
    }

    private static func updateForegroundStateLocked() {
        #if canImport(UIKit)
        isAppActive = UIApplication.shared.applicationState != .background
        #else
        isAppActive = true
        #endif
    }

    private static func registerLifecycleObserversLocked() {
        #if canImport(UIKit)
        guard didBecomeActiveObserver == nil, willResignActiveObserver == nil else { return }

        let center = NotificationCenter.default
        didBecomeActiveObserver = center.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: nil
        ) { _ in
            stateQueue.sync {
                isAppActive = true
                configureAutoFlushLocked()
            }
            Task {
                await handleForegroundDrain(checkPendingCrash: true)
            }
        }

        willResignActiveObserver = center.addObserver(
            forName: UIApplication.willResignActiveNotification,
            object: nil,
            queue: nil
        ) { _ in
            stateQueue.sync {
                isAppActive = false
                stopAutoFlushTimerLocked()
            }
        }
        #endif
    }

    private static func uploadOnce(
        session: URLSession,
        config: CircleBoxCloudConfig,
        task: CircleBoxCloudUploadTask,
        payload: Data
    ) async -> CircleBoxCloudUploadOutcome {
        var request = URLRequest(url: config.endpoint.appendingPathComponent(task.endpointPath))
        request.httpMethod = "POST"
        request.timeoutInterval = 10
        request.setValue(config.ingestKey, forHTTPHeaderField: "x-circlebox-ingest-key")
        request.setValue(task.contentType, forHTTPHeaderField: "content-type")
        request.setValue(task.idempotencyKey, forHTTPHeaderField: "x-circlebox-idempotency-key")

        do {
            let (_, response) = try await session.upload(for: request, from: payload)
            guard let http = response as? HTTPURLResponse else {
                return .retryable
            }
            if (200..<300).contains(http.statusCode) {
                return .success
            }
            if isRetryableStatus(http.statusCode) {
                return .retryable
            }
            return .permanent
        } catch {
            return .retryable
        }
    }

    private static func enqueueFilesLocked(files: [URL], config: CircleBoxCloudConfig) throws {
        for file in files {
            let payload = try Data(contentsOf: file)
            let endpointPath = endpointPath(for: file)
            let contentType = file.pathExtension == "gz" ? "application/json+gzip" : "application/json"
            let idempotencyKey = buildIdempotencyKey(endpointPath: endpointPath, payload: payload)

            if uploadQueue.contains(where: { $0.idempotencyKey == idempotencyKey }) {
                continue
            }

            uploadQueue.append(
                CircleBoxCloudUploadTask(
                    id: UUID().uuidString,
                    endpointPath: endpointPath,
                    filePath: file.path,
                    contentType: contentType,
                    idempotencyKey: idempotencyKey,
                    payloadBytes: payload.count,
                    createdUnixMs: nowMs(),
                    attempts: 0,
                    nextAttemptUnixMs: nowMs()
                )
            )
        }

        trimQueueLocked(maxBytes: config.maxQueueMB * 1024 * 1024)
    }

    private static func endpointPath(for file: URL) -> String {
        if file.pathExtension == "json", file.lastPathComponent.hasSuffix("summary.json") {
            return "v1/ingest/fragment"
        }
        return "v1/ingest/report"
    }

    private static func buildIdempotencyKey(endpointPath: String, payload: Data) -> String {
        var hasher = SHA256()
        hasher.update(data: Data(endpointPath.utf8))
        hasher.update(data: payload)
        let digest = hasher.finalize()
        let hex = digest.map { String(format: "%02x", $0) }.joined()
        return "cb_\(hex)"
    }

    private static func nextReadyTaskLocked() -> CircleBoxCloudUploadTask? {
        let now = nowMs()
        return uploadQueue
            .filter { $0.nextAttemptUnixMs <= now }
            .min(by: { $0.createdUnixMs < $1.createdUnixMs })
    }

    private static func removeTaskLocked(id: String) {
        uploadQueue.removeAll { $0.id == id }
    }

    private static func rescheduleTaskLocked(id: String, retryMaxBackoffSec: TimeInterval) {
        guard let index = uploadQueue.firstIndex(where: { $0.id == id }) else {
            return
        }
        let attempts = uploadQueue[index].attempts + 1
        uploadQueue[index].attempts = attempts
        uploadQueue[index].nextAttemptUnixMs = nextAttemptUnixMs(attempts: attempts, retryMaxBackoffSec: retryMaxBackoffSec)
    }

    private static func nextAttemptUnixMs(attempts: Int, retryMaxBackoffSec: TimeInterval) -> Int64 {
        let exponent = max(0, attempts - 1)
        let base = min(pow(2.0, Double(exponent)), retryMaxBackoffSec)
        let jitter = Double.random(in: 0...(base * 0.25))
        let delayMs = Int64(max(100, (base + jitter) * 1000))
        return nowMs() + delayMs
    }

    private static func isRetryableStatus(_ code: Int) -> Bool {
        if code >= 500 {
            return true
        }
        return code == 408 || code == 409 || code == 425 || code == 429
    }

    private static func trimQueueLocked(maxBytes: Int) {
        var totalBytes = uploadQueue.reduce(0) { $0 + $1.payloadBytes }
        while totalBytes > maxBytes {
            guard let dropIndex = uploadQueue.indices.min(by: { uploadQueue[$0].createdUnixMs < uploadQueue[$1].createdUnixMs }) else {
                break
            }
            totalBytes -= uploadQueue[dropIndex].payloadBytes
            uploadQueue.remove(at: dropIndex)
        }
    }

    private static func ensureQueueLoadedLocked() throws {
        guard !queueLoaded else { return }
        defer { queueLoaded = true }

        let fileURL = try queueFileURLLocked()
        guard let data = try? Data(contentsOf: fileURL), !data.isEmpty else {
            uploadQueue = []
            return
        }

        do {
            uploadQueue = try JSONDecoder().decode([CircleBoxCloudUploadTask].self, from: data)
        } catch {
            uploadQueue = []
        }
    }

    private static func persistQueueLocked() throws {
        let fileURL = try queueFileURLLocked()
        let data = try JSONEncoder().encode(uploadQueue)
        try data.write(to: fileURL, options: [.atomic])
    }

    private static func queueFileURLLocked() throws -> URL {
        let fileManager = FileManager.default
        let baseDirectory = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true)
        let cloudDirectory = baseDirectory
            .appendingPathComponent("CircleBox", isDirectory: true)
            .appendingPathComponent("Cloud", isDirectory: true)
        try fileManager.createDirectory(at: cloudDirectory, withIntermediateDirectories: true)
        return cloudDirectory.appendingPathComponent("upload-queue.json", isDirectory: false)
    }

    private static func usageBeaconStateFileURLLocked() throws -> URL {
        try queueFileURLLocked()
            .deletingLastPathComponent()
            .appendingPathComponent("usage-beacon-state.json", isDirectory: false)
    }

    private static func ensureUsageBeaconStateLoadedLocked() throws {
        guard !usageBeaconStateLoaded else { return }
        defer { usageBeaconStateLoaded = true }

        let fileURL = try usageBeaconStateFileURLLocked()
        guard let data = try? Data(contentsOf: fileURL), !data.isEmpty else {
            usageBeaconState = defaultUsageBeaconStateLocked()
            return
        }

        if let decoded = try? JSONDecoder().decode(CircleBoxCloudUsageBeaconState.self, from: data) {
            usageBeaconState = normalizedUsageStateLocked(decoded)
        } else {
            usageBeaconState = defaultUsageBeaconStateLocked()
        }
    }

    private static func persistUsageBeaconStateLocked() throws {
        guard let usageBeaconState else { return }
        let fileURL = try usageBeaconStateFileURLLocked()
        let data = try JSONEncoder().encode(usageBeaconState)
        try data.write(to: fileURL, options: [.atomic])
    }

    private static func recordUsageAppStartLocked() {
        guard let config, config.enableUsageBeacon else { return }
        var state = usageBeaconState ?? defaultUsageBeaconStateLocked()
        state = normalizedUsageStateLocked(state)
        state.activeApps = state.activeApps &+ 1
        usageBeaconState = state
    }

    private static func applyUsageSummaryIncrementLocked(_ increment: CircleBoxCloudUsageSummaryIncrement) {
        guard let config, config.enableUsageBeacon else { return }
        var state = usageBeaconState ?? defaultUsageBeaconStateLocked()
        state = normalizedUsageStateLocked(state)
        state.crashReports = state.crashReports &+ max(0, increment.crashReports)
        state.eventsEmitted = state.eventsEmitted &+ max(0, increment.eventsEmitted)
        usageBeaconState = state
    }

    private static func sendUsageBeaconIfNeeded(force: Bool) async {
        let snapshot: (url: URL, key: String, mode: String, state: CircleBoxCloudUsageBeaconState)?
        snapshot = stateQueue.sync {
            guard let config, config.enableUsageBeacon else { return nil }
            guard !isSendingUsageBeacon else { return nil }
            guard let key = config.usageBeaconKey?.trimmingCharacters(in: .whitespacesAndNewlines), !key.isEmpty else {
                return nil
            }

            let minIntervalMs = Int64(config.usageBeaconMinIntervalSec * 1000)
            var state = usageBeaconState ?? defaultUsageBeaconStateLocked()
            state = normalizedUsageStateLocked(state)
            let now = nowMs()
            if !force && (now - state.lastSentUnixMs) < minIntervalMs {
                usageBeaconState = state
                return nil
            }

            usageBeaconState = state
            isSendingUsageBeacon = true

            let base = config.usageBeaconEndpoint ?? config.endpoint
            let endpoint = base.appendingPathComponent("v1/telemetry/usage")
            return (endpoint, key, config.usageBeaconMode.rawValue, state)
        }

        guard let snapshot else { return }

        var request = URLRequest(url: snapshot.url)
        request.httpMethod = "POST"
        request.timeoutInterval = 10
        request.setValue(snapshot.key, forHTTPHeaderField: "x-circlebox-usage-key")
        request.setValue("application/json", forHTTPHeaderField: "content-type")

        let body: [String: Any] = [
            "sdk_family": "ios",
            "sdk_version": sdkVersion,
            "mode": snapshot.mode,
            "usage_date": snapshot.state.usageDate,
            "active_apps": snapshot.state.activeApps,
            "crash_reports": snapshot.state.crashReports,
            "events_emitted": snapshot.state.eventsEmitted
        ]
        guard let payload = try? JSONSerialization.data(withJSONObject: body, options: []) else {
            stateQueue.sync {
                isSendingUsageBeacon = false
            }
            return
        }
        request.httpBody = payload

        let session = URLSession(configuration: .ephemeral)
        var success = false
        do {
            let (_, response) = try await session.data(for: request)
            if let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) {
                success = true
            }
        } catch {
            success = false
        }

        stateQueue.sync {
            defer { isSendingUsageBeacon = false }
            if success {
                var state = usageBeaconState ?? defaultUsageBeaconStateLocked()
                state = normalizedUsageStateLocked(state)
                state.lastSentUnixMs = nowMs()
                usageBeaconState = state
                try? persistUsageBeaconStateLocked()
            }
        }
    }

    private static func parseUsageSummaryIncrement(from payload: Data) -> CircleBoxCloudUsageSummaryIncrement? {
        guard let object = try? JSONSerialization.jsonObject(with: payload, options: []) as? [String: Any] else {
            return nil
        }
        let totalEvents = max(0, int64Value(from: object["total_events"]))
        let crashEventPresent = boolValue(from: object["crash_event_present"])
        return CircleBoxCloudUsageSummaryIncrement(
            crashReports: crashEventPresent ? 1 : 0,
            eventsEmitted: totalEvents
        )
    }

    private static func int64Value(from raw: Any?) -> Int64 {
        switch raw {
        case let value as Int:
            return Int64(value)
        case let value as Int64:
            return value
        case let value as NSNumber:
            return value.int64Value
        case let value as String:
            return Int64(value) ?? 0
        default:
            return 0
        }
    }

    private static func boolValue(from raw: Any?) -> Bool {
        switch raw {
        case let value as Bool:
            return value
        case let value as NSNumber:
            return value.boolValue
        case let value as String:
            return (value as NSString).boolValue
        default:
            return false
        }
    }

    private static func defaultUsageBeaconStateLocked() -> CircleBoxCloudUsageBeaconState {
        CircleBoxCloudUsageBeaconState(
            usageDate: currentUsageDateStringLocked(),
            activeApps: 0,
            crashReports: 0,
            eventsEmitted: 0,
            lastSentUnixMs: 0
        )
    }

    private static func normalizedUsageStateLocked(_ state: CircleBoxCloudUsageBeaconState) -> CircleBoxCloudUsageBeaconState {
        let today = currentUsageDateStringLocked()
        guard state.usageDate == today else {
            return CircleBoxCloudUsageBeaconState(
                usageDate: today,
                activeApps: 0,
                crashReports: 0,
                eventsEmitted: 0,
                lastSentUnixMs: 0
            )
        }
        return state
    }

    private static func currentUsageDateStringLocked() -> String {
        usageDateFormatter.string(from: Date())
    }

    private static let usageDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static func nowMs() -> Int64 {
        Int64(Date().timeIntervalSince1970 * 1000)
    }
}
