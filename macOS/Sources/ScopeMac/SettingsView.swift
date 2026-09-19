import SwiftUI
import ScopeCore

public struct SettingsView: View {
    @Bindable var model: MonitorModel
    let updates: UpdateController?
    @State private var endpoint = ""
    @State private var key = ""
    @State private var confirmForget = false
    public init(model: MonitorModel, updates: UpdateController? = nil) { self.model = model; self.updates = updates }
    public var body: some View {
        Form {
            Section("Connection") {
                TextField("Local endpoint", text: $endpoint).textFieldStyle(.roundedBorder)
                SecureField("New API key", text: $key).textFieldStyle(.roundedBorder)
                    .help("Leave blank to keep your current key. New keys are stored in macOS Keychain.")
                Text("Credential source: \(model.credentialSource)").font(.caption).foregroundStyle(.secondary)
                HStack {
                    Button("Save Connection") { model.saveConnection(endpoint: endpoint, newKey: key); key = "" }
                        .buttonStyle(.borderedProminent)
                    Button("Use Saved Connection") { model.useExistingConnection(); endpoint = model.endpoint }
                }
                if let message = model.settingsMessage { Text(message).font(.caption).foregroundStyle(.secondary) }
                Text("Local connections only. Saved connection reads oMLX settings and OpenCode’s oMLX credential. No configuration files are changed.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Section("Menu Bar") {
                Picker("Readout", selection: $model.menuReadout) {
                    ForEach(MenuReadout.allCases) { Text($0.title).tag($0) }
                }
                Picker("Prefill percentage", selection: $model.progressDisplay) {
                    ForEach(ProgressDisplay.allCases) { Text($0.rawValue).tag($0) }
                }
                Text("Activity shows prefill percentage while reading context, then token speed while generating. An asterisk marks held progress, not a live reading.")
                    .font(.caption).foregroundStyle(.secondary)
                Toggle("Energy-saving updates", isOn: $model.efficient)
                Text("One shared sampler serves the window and menu bar. Hidden views update less often; icon-only mode stops hidden sampling. Sleep and pause stop updates. Low Power Mode automatically reduces refresh frequency.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            if let updates {
                Section("Software Updates") {
                    HStack { Text("OMLX Scope \(updates.versionLabel)"); Spacer(); CheckForUpdatesButton(updates: updates) }
                    Text(updates.secureInstallation ? "Signed updates from GitHub." : "Preview build. Updates are installed manually from GitHub.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            Section("Privacy") {
                HStack {
                    Button("Copy Diagnostics") { model.copyDiagnostics() }
                    Button("Forget Saved Key…", role: .destructive) { confirmForget = true }
                }
                Text("Diagnostics contain version and connection state, not keys, prompts, model names, or request data. No analytics or model data leaves the app. Update checks use public GitHub release information.")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }.formStyle(.grouped).padding(8).frame(width: 560)
            .onAppear { endpoint = model.endpoint }
            .confirmationDialog("Remove OMLX Scope’s saved API key?", isPresented: $confirmForget) {
                Button("Forget Key", role: .destructive) { model.forgetKey() }
                Button("Cancel", role: .cancel) {}
            } message: { Text("OpenCode credentials are not deleted. Automatic reuse is disabled until you select Use Saved Connection.") }
    }
}
