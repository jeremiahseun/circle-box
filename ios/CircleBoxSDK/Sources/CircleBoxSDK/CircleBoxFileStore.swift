import Foundation

final class CircleBoxFileStore {
    private let fileManager = FileManager.default
    private let baseURL: URL

    init(namespace: String = "CircleBox") {
        let root = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? fileManager.temporaryDirectory
        self.baseURL = root.appendingPathComponent(namespace, isDirectory: true)
    }

    private var pendingDirectoryURL: URL {
        baseURL.appendingPathComponent("pending", isDirectory: true)
    }

    private var exportDirectoryURL: URL {
        baseURL.appendingPathComponent("exports", isDirectory: true)
    }

    private var pendingFileURL: URL {
        pendingDirectoryURL.appendingPathComponent("latest.circlebox")
    }

    func hasPendingCrashReport() -> Bool {
        fileManager.fileExists(atPath: pendingFileURL.path)
    }

    func clearPendingCrashReport() throws {
        if fileManager.fileExists(atPath: pendingFileURL.path) {
            try fileManager.removeItem(at: pendingFileURL)
        }
    }

    func readPendingEnvelope() -> CircleBoxEnvelope? {
        guard let data = try? Data(contentsOf: pendingFileURL) else {
            return nil
        }
        return try? CircleBoxSerializer.decodeEnvelope(from: data)
    }

    func writePendingEnvelope(_ envelope: CircleBoxEnvelope) throws {
        let data = try CircleBoxSerializer.jsonData(from: envelope)
        try ensureDirectories()
        try atomicWrite(data, to: pendingFileURL)
    }

    func writeExportData(_ data: Data, ext: String) throws -> URL {
        try ensureDirectories()
        let timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        let shortID = UUID().uuidString.prefix(8)
        let fileURL = exportDirectoryURL.appendingPathComponent("circlebox-\(timestamp)-\(shortID).\(ext)")
        try atomicWrite(data, to: fileURL)
        return fileURL
    }

    func availableDiskBytes() -> Int64 {
        if let values = try? baseURL.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey]),
           let available = values.volumeAvailableCapacityForImportantUsage {
            return Int64(available)
        }
        if let attrs = try? fileManager.attributesOfFileSystem(forPath: baseURL.path),
           let free = attrs[.systemFreeSize] as? NSNumber {
            return free.int64Value
        }
        return -1
    }

    private func ensureDirectories() throws {
        try fileManager.createDirectory(at: pendingDirectoryURL, withIntermediateDirectories: true)
        try fileManager.createDirectory(at: exportDirectoryURL, withIntermediateDirectories: true)
    }

    private func atomicWrite(_ data: Data, to destination: URL) throws {
        let tempURL = destination.deletingLastPathComponent().appendingPathComponent(".\(UUID().uuidString).tmp")
        var shouldCleanupTemp = true
        defer {
            if shouldCleanupTemp {
                try? fileManager.removeItem(at: tempURL)
            }
        }

        guard fileManager.createFile(atPath: tempURL.path, contents: nil) else {
            throw NSError(
                domain: "CircleBoxFileStore",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Could not create temp file for atomic write."]
            )
        }

        let handle = try FileHandle(forWritingTo: tempURL)
        do {
            if #available(iOS 13.4, macOS 10.15.4, *) {
                try handle.write(contentsOf: data)
                try handle.synchronize()
                try handle.close()
            } else {
                handle.write(data)
                handle.synchronizeFile()
                handle.closeFile()
            }
        } catch {
            try? handle.close()
            throw error
        }

        if fileManager.fileExists(atPath: destination.path) {
            try fileManager.removeItem(at: destination)
        }

        try fileManager.moveItem(at: tempURL, to: destination)
        shouldCleanupTemp = false
    }
}
