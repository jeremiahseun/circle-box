import SwiftUI
import CircleBoxSDK
#if canImport(Darwin)
import Darwin
#endif

struct ContentView: View {
    @State private var activeAlert: ActiveAlert?
    @State private var viewerEvents: [CircleBoxEvent] = []
    @State private var typeFilter = "all"
    @State private var severityFilter = "all"
    @State private var threadFilter = "all"

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

                Button("Open Local Viewer") {
                    viewerEvents = CircleBox.debugSnapshot(maxEvents: 200)
                    let typeOptions = Set(viewerEvents.map(\.type))
                    if !typeOptions.contains(typeFilter) {
                        typeFilter = "all"
                    }
                }

                Button("Hard Crash") {
                    preconditionFailure("Intentional crash")
                }

                Button("Signal Crash (SIGABRT)") {
                    raise(SIGABRT)
                }

                Spacer()

                if !viewerEvents.isEmpty {
                    Text("Viewer Events")
                        .font(.headline)
                    Text("Showing \(filteredViewerEvents.count)/\(viewerEvents.count)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    VStack(alignment: .leading, spacing: 8) {
                        Picker("Type", selection: $typeFilter) {
                            ForEach(typeFilterOptions, id: \.self) { value in
                                Text(value).tag(value)
                            }
                        }
                        .pickerStyle(.menu)

                        Picker("Severity", selection: $severityFilter) {
                            ForEach(severityFilterOptions, id: \.self) { value in
                                Text(value).tag(value)
                            }
                        }
                        .pickerStyle(.menu)

                        Picker("Thread", selection: $threadFilter) {
                            ForEach(threadFilterOptions, id: \.self) { value in
                                Text(value).tag(value)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                    ScrollView {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(Array(filteredViewerEvents.enumerated()), id: \.offset) { _, event in
                                Text("#\(event.seq) \(event.type) [\(event.severity.rawValue)] \(event.attrs)")
                                    .font(.caption)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                    }
                    .frame(maxHeight: 220)
                }
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

    private var typeFilterOptions: [String] {
        ["all"] + Array(Set(viewerEvents.map(\.type))).sorted()
    }

    private var severityFilterOptions: [String] {
        ["all", "info", "warn", "error", "fatal"]
    }

    private var threadFilterOptions: [String] {
        ["all", "main", "background", "crash"]
    }

    private var filteredViewerEvents: [CircleBoxEvent] {
        viewerEvents.filter { event in
            let typeMatch = typeFilter == "all" || event.type == typeFilter
            let severityMatch = severityFilter == "all" || event.severity.rawValue == severityFilter
            let threadMatch = threadFilter == "all" || event.thread.rawValue == threadFilter
            return typeMatch && severityMatch && threadMatch
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
