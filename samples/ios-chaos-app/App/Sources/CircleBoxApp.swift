import SwiftUI
import CircleBoxSDK

// In CircleBoxApp.swift
@main
struct CircleBoxApp: App {
    init() {
        print("CircleBoxApp init")
         CircleBox.start() // keep commented for now
    }

    var body: some Scene {
        print("CircleBoxApp body")
        return WindowGroup {
            ContentView()
                .background(Color.red) // force visible background
        }
    }
}
