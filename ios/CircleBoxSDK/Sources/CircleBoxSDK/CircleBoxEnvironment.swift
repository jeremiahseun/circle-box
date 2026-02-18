import Foundation

#if canImport(UIKit)
import UIKit
#endif

struct CircleBoxEnvironment {
    let sessionID: String
    let platform: String
    let appVersion: String
    let buildNumber: String
    let osVersion: String
    let deviceModel: String

    static func current() -> CircleBoxEnvironment {
        let bundle = Bundle.main
        let info = bundle.infoDictionary ?? [:]
        let appVersion = info["CFBundleShortVersionString"] as? String ?? "0"
        let buildNumber = info["CFBundleVersion"] as? String ?? "0"

        #if canImport(UIKit)
        let osVersion = UIDevice.current.systemVersion
        let deviceModel = UIDevice.current.model
        #else
        let osVersion = ProcessInfo.processInfo.operatingSystemVersionString
        let deviceModel = Host.current().localizedName ?? "mac"
        #endif

        return CircleBoxEnvironment(
            sessionID: UUID().uuidString,
            platform: "ios",
            appVersion: appVersion,
            buildNumber: buildNumber,
            osVersion: osVersion,
            deviceModel: deviceModel
        )
    }
}
