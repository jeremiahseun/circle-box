import Foundation

#if canImport(UIKit)
import UIKit
#endif

#if canImport(Network)
import Network
#endif

#if canImport(CoreLocation)
import CoreLocation
#endif

#if canImport(AVFoundation)
import AVFoundation
#endif

struct CircleBoxPermissionSnapshot {
    let location: String
    let camera: String

    static func current() -> CircleBoxPermissionSnapshot {
        #if os(iOS) && canImport(CoreLocation)
        let locationStatus: String
        if #available(iOS 14.0, *) {
            locationStatus = String(describing: CLLocationManager().authorizationStatus)
        } else {
            locationStatus = String(describing: CLLocationManager.authorizationStatus())
        }
        #else
        let locationStatus = "unsupported"
        #endif

        #if os(iOS) && canImport(AVFoundation)
        let cameraStatus = String(describing: AVCaptureDevice.authorizationStatus(for: .video))
        #else
        let cameraStatus = "unsupported"
        #endif

        return CircleBoxPermissionSnapshot(location: locationStatus, camera: cameraStatus)
    }
}

final class CircleBoxSystemMonitors {
    typealias EventSink = (_ type: String, _ severity: CircleBoxEventSeverity, _ attrs: [String: String], _ thread: CircleBoxEventThread) -> Void

    private let config: CircleBoxConfig
    private let fileStore: CircleBoxFileStore
    private let sink: EventSink

    private var observers: [NSObjectProtocol] = []
    private var jankMonitor: CircleBoxMainThreadJankMonitor?
    private var diskTimer: DispatchSourceTimer?

    #if canImport(Network)
    private var pathMonitor: NWPathMonitor?
    private let pathQueue = DispatchQueue(label: "com.circlebox.sdk.network")
    #endif

    private var lastConnectivity = "unknown"
    private var lastPermissions = CircleBoxPermissionSnapshot.current()

    init(config: CircleBoxConfig, fileStore: CircleBoxFileStore, sink: @escaping EventSink) {
        self.config = config
        self.fileStore = fileStore
        self.sink = sink
    }

    func start() {
        #if canImport(UIKit)
        // UIKit notifications cover lifecycle, memory pressure, thermal and battery signals.
        UIDevice.current.isBatteryMonitoringEnabled = true
        registerUIKitObservers()
        emitBattery()
        emitThermal()
        emitLowPower()
        #endif

        startConnectivity()
        startDiskChecks()
        startJankMonitor()
    }

    func stop() {
        for observer in observers {
            NotificationCenter.default.removeObserver(observer)
        }
        observers.removeAll()

        #if canImport(Network)
        pathMonitor?.cancel()
        pathMonitor = nil
        #endif

        diskTimer?.setEventHandler {}
        diskTimer?.cancel()
        diskTimer = nil

        jankMonitor?.stop()
        jankMonitor = nil
    }

    private func startJankMonitor() {
        let monitor = CircleBoxMainThreadJankMonitor(thresholdMs: config.jankThresholdMs) { [weak self] lagMs in
            self?.sink(
                "thread_contention",
                .warn,
                ["blocked_ms": String(lagMs), "threshold_ms": String(self?.config.jankThresholdMs ?? 0)],
                .background
            )
        }
        monitor.start()
        jankMonitor = monitor
    }

    private func startDiskChecks() {
        let timer = DispatchSource.makeTimerSource(queue: DispatchQueue(label: "com.circlebox.sdk.disk"))
        timer.schedule(deadline: .now(), repeating: config.diskCheckIntervalSec)
        timer.setEventHandler { [weak self] in
            guard let self else { return }
            let bytes = self.fileStore.availableDiskBytes()
            self.sink("disk_space", .info, ["available_bytes": String(bytes)], .background)
        }
        diskTimer = timer
        timer.resume()
    }

    private func startConnectivity() {
        #if canImport(Network)
        let monitor = NWPathMonitor()
        monitor.pathUpdateHandler = { [weak self] path in
            guard let self else { return }
            // Keep connectivity values normalized across platforms for easier backend parsing.
            let status: String
            if path.status != .satisfied {
                status = "none"
            } else if path.usesInterfaceType(.wifi) {
                status = "wifi"
            } else if path.usesInterfaceType(.cellular) {
                status = "cellular"
            } else if path.usesInterfaceType(.wiredEthernet) {
                status = "ethernet"
            } else {
                status = "other"
            }

            let previous = self.lastConnectivity
            self.lastConnectivity = status
            self.sink(
                "connectivity_transition",
                .info,
                ["from": previous, "to": status],
                .background
            )
        }
        monitor.start(queue: pathQueue)
        pathMonitor = monitor
        #else
        sink("connectivity_transition", .info, ["from": "unknown", "to": "unsupported"], .background)
        #endif
    }

    #if canImport(UIKit)
    private func registerUIKitObservers() {
        let center = NotificationCenter.default

        observers.append(center.addObserver(
            forName: UIApplication.didReceiveMemoryWarningNotification,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            self?.sink("memory_pressure", .warn, ["source": "os_warning"], .main)
        })

        observers.append(center.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            self?.sink("lifecycle", .info, ["state": "background"], .main)
        })

        observers.append(center.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            guard let self else { return }
            self.sink("lifecycle", .info, ["state": "foreground"], .main)
            self.detectPermissionChanges()
        })

        observers.append(center.addObserver(
            forName: ProcessInfo.thermalStateDidChangeNotification,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            self?.emitThermal()
        })

        observers.append(center.addObserver(
            forName: Notification.Name.NSProcessInfoPowerStateDidChange,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            self?.emitLowPower()
        })

        observers.append(center.addObserver(
            forName: UIDevice.batteryLevelDidChangeNotification,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            self?.emitBattery()
        })

        observers.append(center.addObserver(
            forName: UIDevice.batteryStateDidChangeNotification,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            self?.emitBattery()
        })
    }

    private func emitThermal() {
        let state: String
        switch ProcessInfo.processInfo.thermalState {
        case .nominal:
            state = "nominal"
        case .fair:
            state = "fair"
        case .serious:
            state = "serious"
        case .critical:
            state = "critical"
        @unknown default:
            state = "unknown"
        }
        sink("thermal_state", .info, ["state": state], .main)
    }

    private func emitLowPower() {
        sink(
            "battery_low_power",
            .info,
            ["enabled": String(ProcessInfo.processInfo.isLowPowerModeEnabled)],
            .main
        )
    }

    private func emitBattery() {
        let level = UIDevice.current.batteryLevel
        let percent = level < 0 ? -1 : Int(level * 100)
        sink(
            "battery_health",
            .info,
            [
                "percent": String(percent),
                "state": String(describing: UIDevice.current.batteryState)
            ],
            .main
        )
    }
    #endif

    private func detectPermissionChanges() {
        let current = CircleBoxPermissionSnapshot.current()

        if current.location != lastPermissions.location {
            sink(
                "permission_change",
                .warn,
                ["permission": "location", "from": lastPermissions.location, "to": current.location],
                .main
            )
        }

        if current.camera != lastPermissions.camera {
            sink(
                "permission_change",
                .warn,
                ["permission": "camera", "from": lastPermissions.camera, "to": current.camera],
                .main
            )
        }

        lastPermissions = current
    }
}
