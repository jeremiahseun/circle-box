import SwiftUI
import CircleBoxSDK

@main
struct CircleBoxApp: App {
    init() {
        CircleBox.start()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
