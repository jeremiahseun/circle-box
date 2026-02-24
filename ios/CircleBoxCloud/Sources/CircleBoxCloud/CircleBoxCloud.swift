import Foundation
import CryptoKit
import CircleBoxSDK

#if canImport(UIKit)
import UIKit
#endif

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

    public init(
        endpoint: URL,
        ingestKey: String,
        region: String = "auto",
        enableFragmentSync: Bool = true,
        flushIntervalSec: TimeInterval = 60,
        maxQueueMB: Int = 20,
        wifiOnly: Bool = false,
        retryMaxBackoffSec: TimeInterval = 900,
        enableAutoFlush: Bool = true,
        autoExportPendingOnStart: Bool = true
    ) {
        self.endpoint = endpoint
        self.ingestKey = ingestKey
        self.region = region
        self.enableFragmentSync = enableFragmentSync
        self.flushIntervalSec = max(10, flushIntervalSec)
        self.maxQueueMB = max(1, maxQueueMB)
        self.wifiOnly = wifiOnly
        self.retryMaxBackoffSec = max(30, retryMaxBackoffSec)
        self.enableAutoFlush = enableAutoFlush
        self.autoExportPendingOnStart = autoExportPendingOnStart
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

public enum CircleBoxCloud {
    private static let stateQueue = DispatchQueue(label: "com.circlebox.cloud.uploader.state")
    private static var config: CircleBoxCloudConfig?
    private static var paused = false
    private static var uploadQueue: [CircleBoxCloudUploadTask] = []
    private static var queueLoaded = false
    private static var isProcessingQueue = false
    private static var autoFlushTimer: DispatchSourceTimer?
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
            updateForegroundStateLocked()
            configureAutoFlushLocked()
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
            return
        }

        if localConfig.enableAutoFlush {
            await processQueueIfNeeded()
        }
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
                case .retryable:
                    rescheduleTaskLocked(id: task.id, retryMaxBackoffSec: localConfig.retryMaxBackoffSec)
                case .permanent:
                    removeTaskLocked(id: task.id)
                }
                try? persistQueueLocked()
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

    private static func nowMs() -> Int64 {
        Int64(Date().timeIntervalSince1970 * 1000)
    }
}
