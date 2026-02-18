import SwiftUI
import CircleBoxSDK


struct ContentView: View {
    init(){
        print("ContentView init")
    }
    @State private var showingExportResult = false
    @State private var exportMessage = ""
    @State private var showingCrashPrompt = false

    var body: some View {
        print("ContentView body")
        return NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                Button("Mock Thermal Spike") {
                    CircleBox.breadcrumb("Mock thermal spike", attrs: ["state": "critical"])
                }
                .buttonStyle(.borderedProminent)

                Button("Mock Low Battery") {
                    CircleBox.breadcrumb("Mock low battery", attrs: ["percent": "7", "low_power_mode": "true"])
                }
                .buttonStyle(.borderedProminent)

                Button("Mock No Internet") {
                    CircleBox.breadcrumb("Mock no internet", attrs: ["to": "none"])
                }
                .buttonStyle(.borderedProminent)

                Button("Mock Permission Revoked") {
                    CircleBox.breadcrumb("Mock permission revoked", attrs: ["permission": "camera", "to": "denied"])
                }
                .buttonStyle(.borderedProminent)

                Button("Mock Low Disk") {
                    CircleBox.breadcrumb("Mock low disk", attrs: ["available_bytes": "1024"])
                }
                .buttonStyle(.borderedProminent)

                Button("Add Breadcrumb") {
                    CircleBox.breadcrumb("User started Checkout", attrs: ["flow": "checkout"])
                }
                .buttonStyle(.borderedProminent)

                Button("Export Logs") {
                    do {
                        let files = try CircleBox.exportLogs()
                        exportMessage = "Exported \(files.count) file(s)"
                    } catch {
                        exportMessage = "Export failed: \(error.localizedDescription)"
                    }
                    showingExportResult = true
                }
                .buttonStyle(.borderedProminent)

                Button("Hard Crash") {
                    preconditionFailure("Intentional crash")
                }
                .tint(.red)
                .buttonStyle(.borderedProminent)

                Spacer()
            }
            .padding()
            .navigationTitle("CircleBox Chaos")
            .task {
                if CircleBox.hasPendingCrashReport() {
                    showingCrashPrompt = true
                }
            }
            .alert("CircleBox", isPresented: $showingExportResult) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(exportMessage)
            }
            .alert("Crash Report Found", isPresented: $showingCrashPrompt) {
                Button("Later", role: .cancel) { }
                Button("Export") {
                    do {
                        let files = try CircleBox.exportLogs()
                        exportMessage = "Exported \(files.count) file(s)"
                    } catch {
                        exportMessage = "Export failed: \(error.localizedDescription)"
                    }
                    showingExportResult = true
                }
            } message: {
                Text("A pending .circlebox report exists. Export now?")
            }
        }
    }
}
//
//#Preview {
//    ContentView()
//}
