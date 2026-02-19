import Foundation
import React

#if canImport(CircleBoxSDK)
import CircleBoxSDK
#endif

@objc(CircleBoxReactNative)
final class CircleBoxReactNative: NSObject {
    @objc
    static func requiresMainQueueSetup() -> Bool {
        false
    }

    @objc(start:resolver:rejecter:)
    func start(
        _ config: NSDictionary?,
        resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        #if canImport(CircleBoxSDK)
        let cfg = config as? [String: Any] ?? [:]
        let circleConfig = CircleBoxConfig(
            bufferCapacity: cfg["bufferCapacity"] as? Int ?? 50,
            jankThresholdMs: UInt64((cfg["jankThresholdMs"] as? NSNumber)?.uint64Value ?? 200),
            sanitizeAttributes: cfg["sanitizeAttributes"] as? Bool ?? true,
            maxAttributeLength: cfg["maxAttributeLength"] as? Int ?? 256,
            diskCheckIntervalSec: cfg["diskCheckIntervalSec"] as? TimeInterval ?? 60,
            enableSignalCrashCapture: cfg["enableSignalCrashCapture"] as? Bool ?? true,
            enableDebugViewer: cfg["enableDebugViewer"] as? Bool ?? false
        )
        CircleBox.start(config: circleConfig)
        resolve(nil)
        #else
        reject("missing_native_sdk", "CircleBoxSDK is not linked in the iOS host app", nil)
        #endif
    }

    @objc(breadcrumb:attrs:resolver:rejecter:)
    func breadcrumb(
        _ message: String,
        attrs: NSDictionary?,
        resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        #if canImport(CircleBoxSDK)
        let rawAttrs = attrs as? [String: Any] ?? [:]
        let attrs = rawAttrs.reduce(into: [String: String]()) { partialResult, item in
            partialResult[item.key] = String(describing: item.value)
        }
        CircleBox.breadcrumb(message, attrs: attrs)
        resolve(nil)
        #else
        reject("missing_native_sdk", "CircleBoxSDK is not linked in the iOS host app", nil)
        #endif
    }

    @objc(exportLogs:resolver:rejecter:)
    func exportLogs(
        _ formats: NSArray?,
        resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        #if canImport(CircleBoxSDK)
        do {
            let wireFormats = (formats as? [String]) ?? ["json", "csv"]
            var nativeFormats = Set<CircleBoxExportFormat>()

            for wire in wireFormats {
                switch wire.lowercased() {
                case "json":
                    nativeFormats.insert(.json)
                case "csv":
                    nativeFormats.insert(.csv)
                case "json_gzip":
                    nativeFormats.insert(.jsonGzip)
                case "csv_gzip":
                    nativeFormats.insert(.csvGzip)
                case "summary":
                    nativeFormats.insert(.summary)
                default:
                    continue
                }
            }

            if nativeFormats.isEmpty {
                nativeFormats = [.json, .csv]
            }

            let urls = try CircleBox.exportLogs(formats: nativeFormats)
            resolve(urls.map(\.path))
        } catch {
            reject("circlebox_export_failed", error.localizedDescription, error)
        }
        #else
        reject("missing_native_sdk", "CircleBoxSDK is not linked in the iOS host app", nil)
        #endif
    }

    @objc(hasPendingCrashReport:rejecter:)
    func hasPendingCrashReport(
        _ resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        #if canImport(CircleBoxSDK)
        resolve(CircleBox.hasPendingCrashReport())
        #else
        reject("missing_native_sdk", "CircleBoxSDK is not linked in the iOS host app", nil)
        #endif
    }

    @objc(clearPendingCrashReport:rejecter:)
    func clearPendingCrashReport(
        _ resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        #if canImport(CircleBoxSDK)
        do {
            try CircleBox.clearPendingCrashReport()
            resolve(nil)
        } catch {
            reject("circlebox_clear_failed", error.localizedDescription, error)
        }
        #else
        reject("missing_native_sdk", "CircleBoxSDK is not linked in the iOS host app", nil)
        #endif
    }

    @objc(debugSnapshot:resolver:rejecter:)
    func debugSnapshot(
        _ maxEvents: NSNumber?,
        resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        #if canImport(CircleBoxSDK)
        let maxEvents = maxEvents?.intValue ?? 200
        let events = CircleBox.debugSnapshot(maxEvents: maxEvents).map { event in
            [
                "seq": event.seq,
                "timestamp_unix_ms": event.timestampUnixMs,
                "uptime_ms": event.uptimeMs,
                "type": event.type,
                "thread": event.thread.rawValue,
                "severity": event.severity.rawValue,
                "attrs": event.attrs
            ] as [String: Any]
        }
        resolve(events)
        #else
        reject("missing_native_sdk", "CircleBoxSDK is not linked in the iOS host app", nil)
        #endif
    }
}
