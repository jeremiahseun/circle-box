import Foundation
#if canImport(Darwin)
import Darwin
#endif

struct CircleBoxSignalMarker: Sendable {
    let signal: Int32
    let name: String
    let timestampUnixMs: Int64
}

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

    private var checkpointFileURL: URL {
        pendingDirectoryURL.appendingPathComponent("checkpoint.circlebox")
    }

    private var signalMarkerFileURL: URL {
        pendingDirectoryURL.appendingPathComponent("signal.marker")
    }

    func hasPendingCrashReport() -> Bool {
        fileManager.fileExists(atPath: pendingFileURL.path)
    }

    func clearPendingCrashReport() throws {
        if fileManager.fileExists(atPath: pendingFileURL.path) {
            try fileManager.removeItem(at: pendingFileURL)
        }
    }

    func readCheckpointEnvelope() -> CircleBoxEnvelope? {
        guard let data = try? Data(contentsOf: checkpointFileURL) else {
            return nil
        }
        return try? CircleBoxSerializer.decodeEnvelope(from: data)
    }

    func writeCheckpointEnvelope(_ envelope: CircleBoxEnvelope) throws {
        let data = try CircleBoxSerializer.jsonData(from: envelope)
        try ensureDirectories()
        try atomicWrite(data, to: checkpointFileURL)
    }

    func clearCheckpointEnvelope() throws {
        if fileManager.fileExists(atPath: checkpointFileURL.path) {
            try fileManager.removeItem(at: checkpointFileURL)
        }
    }

    func signalMarkerPathCString() -> [CChar]? {
        let path = signalMarkerFileURL.path
        let cPath = path.utf8CString
        #if canImport(Darwin)
        if cPath.count >= Int(PATH_MAX) {
            return nil
        }
        #endif
        return Array(cPath)
    }

    func readSignalMarker() -> CircleBoxSignalMarker? {
        guard let data = try? Data(contentsOf: signalMarkerFileURL), data.count >= 4 else {
            return nil
        }

        var rawSignal: Int32 = 0
        _ = withUnsafeMutableBytes(of: &rawSignal) { buffer in
            data.copyBytes(to: buffer, from: 0..<4)
        }
        let signal = Int32(littleEndian: rawSignal)

        let timestampUnixMs: Int64
        if data.count >= 12 {
            var rawTimestamp: Int64 = 0
            _ = withUnsafeMutableBytes(of: &rawTimestamp) { buffer in
                data.copyBytes(to: buffer, from: 4..<12)
            }
            timestampUnixMs = Int64(littleEndian: rawTimestamp)
        } else {
            timestampUnixMs = Int64(Date().timeIntervalSince1970 * 1000)
        }

        return CircleBoxSignalMarker(
            signal: signal,
            name: Self.signalName(for: signal),
            timestampUnixMs: timestampUnixMs
        )
    }

    func writeSignalMarker(_ marker: CircleBoxSignalMarker) throws {
        try ensureDirectories()

        var signalLE = marker.signal.littleEndian
        var timestampLE = marker.timestampUnixMs.littleEndian
        var data = Data()
        withUnsafeBytes(of: &signalLE) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: &timestampLE) { data.append(contentsOf: $0) }
        try atomicWrite(data, to: signalMarkerFileURL)
    }

    func clearSignalMarker() throws {
        if fileManager.fileExists(atPath: signalMarkerFileURL.path) {
            try fileManager.removeItem(at: signalMarkerFileURL)
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

    private static func signalName(for signal: Int32) -> String {
        switch signal {
        case SIGABRT:
            return "SIGABRT"
        case SIGSEGV:
            return "SIGSEGV"
        case SIGBUS:
            return "SIGBUS"
        case SIGILL:
            return "SIGILL"
        case SIGTRAP:
            return "SIGTRAP"
        case SIGFPE:
            return "SIGFPE"
        default:
            return "SIG\(signal)"
        }
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
