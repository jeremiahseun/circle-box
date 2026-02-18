import SwiftUI
import CircleBoxSDK
#if canImport(Darwin)
import Darwin
#endif

struct ContentView: View {
    @State private var activeAlert: ActiveAlert?

    var body: some View {
        NavigationView {
            VStack(alignment: .leading, spacing: 12) {
                Button("Mock Thermal Spike") {
                    CircleBox.breadcrumb("Mock thermal spike", attrs: ["state": "critical"])
                }

                Button("Mock Low Battery") {
                    CircleBox.breadcrumb("Mock low battery", attrs: ["percent": "7", "low_power_mode": "true"])
                }

                Button("Mock No Internet") {
                    CircleBox.breadcrumb("Mock no internet", attrs: ["to": "none"])
                }

                Button("Mock Permission Revoked") {
                    CircleBox.breadcrumb("Mock permission revoked", attrs: ["permission": "camera", "to": "denied"])
                }

                Button("Mock Low Disk") {
                    CircleBox.breadcrumb("Mock low disk", attrs: ["available_bytes": "1024"])
                }

                Button("Add Breadcrumb") {
                    CircleBox.breadcrumb("User started Checkout", attrs: ["flow": "checkout"])
                }

                Button("Export Logs") {
                    exportLogs()
                }

                Button("Hard Crash") {
                    preconditionFailure("Intentional crash")
                }

                Button("Signal Crash (SIGABRT)") {
                    raise(SIGABRT)
                }

                Spacer()
            }
            .padding()
            .navigationBarTitle("CircleBox Chaos", displayMode: .inline)
            .onAppear {
                if CircleBox.hasPendingCrashReport() {
                    activeAlert = .pendingCrashReport
                }
            }
            .alert(item: $activeAlert) { alert in
                switch alert {
                case .exportResult(let message):
                    return Alert(
                        title: Text("CircleBox"),
                        message: Text(message),
                        dismissButton: .default(Text("OK"))
                    )
                case .pendingCrashReport:
                    return Alert(
                        title: Text("Crash Report Found"),
                        message: Text("A pending .circlebox report exists. Export now?"),
                        primaryButton: .default(Text("Export"), action: exportLogs),
                        secondaryButton: .cancel(Text("Later"))
                    )
                }
            }
        }
    }

    private func exportLogs() {
        do {
            let files = try CircleBox.exportLogs()
            activeAlert = .exportResult("Exported \(files.count) file(s)")
        } catch {
            activeAlert = .exportResult("Export failed: \(error.localizedDescription)")
        }
    }
}

private enum ActiveAlert: Identifiable {
    case exportResult(String)
    case pendingCrashReport

    var id: String {
        switch self {
        case .exportResult(let message):
            return "export:\(message)"
        case .pendingCrashReport:
            return "pending-crash-report"
        }
    }
}
