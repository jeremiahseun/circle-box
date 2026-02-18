import Flutter
import UIKit

#if canImport(CircleBoxSDK)
import CircleBoxSDK
#endif

/// Flutter bridge for the iOS CircleBox SDK.
public class CircleboxFlutterPlugin: NSObject, FlutterPlugin {
  public static func register(with registrar: FlutterPluginRegistrar) {
    let channel = FlutterMethodChannel(name: "circlebox_flutter", binaryMessenger: registrar.messenger())
    let instance = CircleboxFlutterPlugin()
    registrar.addMethodCallDelegate(instance, channel: channel)
  }

  public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "start":
      #if canImport(CircleBoxSDK)
      let args = call.arguments as? [String: Any] ?? [:]
      let config = CircleBoxConfig(
        bufferCapacity: args["bufferCapacity"] as? Int ?? 50,
        jankThresholdMs: UInt64(args["jankThresholdMs"] as? Int ?? 200),
        sanitizeAttributes: args["sanitizeAttributes"] as? Bool ?? true,
        maxAttributeLength: args["maxAttributeLength"] as? Int ?? 256,
        diskCheckIntervalSec: args["diskCheckIntervalSec"] as? TimeInterval ?? 60
      )
      CircleBox.start(config: config)
      result(nil)
      #else
      // Keep plugin buildable without forcing every host app to link CircleBoxSDK immediately.
      result(FlutterError(code: "missing_native_sdk", message: "CircleBoxSDK is not linked in the iOS host app", details: nil))
      #endif

    case "breadcrumb":
      guard
        let args = call.arguments as? [String: Any],
        let message = args["message"] as? String
      else {
        result(FlutterError(code: "bad_args", message: "Missing message", details: nil))
        return
      }

      let attrs = args["attrs"] as? [String: String] ?? [:]

      #if canImport(CircleBoxSDK)
      CircleBox.breadcrumb(message, attrs: attrs)
      result(nil)
      #else
      result(FlutterError(code: "missing_native_sdk", message: "CircleBoxSDK is not linked in the iOS host app", details: nil))
      #endif

    case "exportLogs":
      #if canImport(CircleBoxSDK)
      do {
        let args = call.arguments as? [String: Any] ?? [:]
        let rawFormats = args["formats"] as? [String] ?? ["json", "csv"]
        var formats = Set<CircleBoxExportFormat>()
        for item in rawFormats {
          switch item.lowercased() {
          case "json":
            formats.insert(.json)
          case "csv":
            formats.insert(.csv)
          default:
            continue
          }
        }
        if formats.isEmpty {
          formats = [.json, .csv]
        }

        let urls = try CircleBox.exportLogs(formats: formats)
        result(urls.map { $0.path })
      } catch {
        result(FlutterError(code: "export_failed", message: error.localizedDescription, details: nil))
      }
      #else
      result(FlutterError(code: "missing_native_sdk", message: "CircleBoxSDK is not linked in the iOS host app", details: nil))
      #endif

    case "hasPendingCrashReport":
      #if canImport(CircleBoxSDK)
      result(CircleBox.hasPendingCrashReport())
      #else
      result(false)
      #endif

    case "clearPendingCrashReport":
      #if canImport(CircleBoxSDK)
      do {
        try CircleBox.clearPendingCrashReport()
        result(nil)
      } catch {
        result(FlutterError(code: "clear_failed", message: error.localizedDescription, details: nil))
      }
      #else
      result(FlutterError(code: "missing_native_sdk", message: "CircleBoxSDK is not linked in the iOS host app", details: nil))
      #endif

    default:
      result(FlutterMethodNotImplemented)
    }
  }
}
