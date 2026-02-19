import SwiftUI
import CircleBoxSDK

@main
struct CircleBoxApp: App {
    init() {
        CircleBox.start(config: CircleBoxConfig(enableDebugViewer: true))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
