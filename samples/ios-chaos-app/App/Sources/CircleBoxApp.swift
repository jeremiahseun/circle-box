import SwiftUI
import CircleBoxSDK
#if canImport(CircleBoxCloud)
import CircleBoxCloud
#endif

@main
struct CircleBoxApp: App {
    init() {
        CircleBox.start(config: CircleBoxConfig(bufferCapacity: 300, enableSignalCrashCapture: true))
        startCloudIfConfigured()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }

#if canImport(CircleBoxCloud)
    private func startCloudIfConfigured() {
        let env = ProcessInfo.processInfo.environment
        guard
            let endpointRaw = env["CIRCLEBOX_WORKER_BASE_URL"]?.trimmingCharacters(in: .whitespacesAndNewlines),
            !endpointRaw.isEmpty,
            let ingestKey = env["CIRCLEBOX_INGEST_KEY"]?.trimmingCharacters(in: .whitespacesAndNewlines),
            !ingestKey.isEmpty,
            let endpoint = URL(string: endpointRaw)
        else {
            return
        }

        let usageKey = env["CIRCLEBOX_USAGE_KEY"]?.trimmingCharacters(in: .whitespacesAndNewlines)
        CircleBoxCloud.start(
            config: CircleBoxCloudConfig(
                endpoint: endpoint,
                ingestKey: ingestKey,
                enableAutoFlush: true,
                autoExportPendingOnStart: true,
                enableUsageBeacon: !(usageKey?.isEmpty ?? true),
                usageBeaconKey: (usageKey?.isEmpty ?? true) ? nil : usageKey,
                usageBeaconMode: .coreCloud
            )
        )
        CircleBox.breadcrumb("cloud_uploader_enabled", attrs: ["mode": "core_cloud"])
    }
#else
    private func startCloudIfConfigured() {
        // CircleBoxCloud not available; skip cloud startup.
    }
#endif
}
