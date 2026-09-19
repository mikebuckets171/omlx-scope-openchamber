import SwiftUI
import ScopeCore

public struct SettingsView: View {
    @Bindable var model: MonitorModel
    let updates: UpdateController?
    @State private var endpoint = ""
    @State private var key = ""
    @State private var remember = false
    @State private var confirmForget = false
    public init(model: MonitorModel, updates: UpdateController? = nil) { self.model = model; self.updates = updates }
    public var body: some View {
        Form {
            Section("Connection") {
                TextField("Local endpoint", text: $endpoint).textFieldStyle(.roundedBorder)
                SecureField("New API key", text: $key).textFieldStyle(.roundedBorder)
                    .help("Leave blank to keep your current key. By default, a new key is kept only until you quit.")
                Toggle("Save new key in Keychain", isOn: $remember)
                Text(remember ? "Saving in Keychain may ask for macOS authorization. Opening the saved key on a future launch is your choice."
                     : "This launch only. No Keychain access or new credential file is needed.")
                    .font(.caption).foregroundStyle(.secondary)
                HStack {
                    Button("Apply Connection") {
                        Task { if await model.saveConnection(endpoint: endpoint, newKey: key, rememberInKeychain: remember) { key = "" } }
                    }.buttonStyle(.borderedProminent)
                    Button("Use OpenCode Connection") { model.useExistingConnection(); endpoint = model.endpoint }
                }.disabled(model.connectionBusy)
                Text("Key source: \(model.credentialSource)").font(.caption).foregroundStyle(.secondary)
                if let message = model.settingsMessage { Text(message).font(.caption).foregroundStyle(.secondary).accessibilityIdentifier("connection-feedback") }
                Text("Host resources work without an API key. oMLX decides whether its readings require one. Saved OpenCode and oMLX files are read, never changed.")
                    .font(.caption).foregroundStyle(.secondary)
            }.disabled(model.connectionBusy)
            Section("Saved Keychain Key") {
                HStack {
                    Button("Use Keychain Key…") { Task { await model.useKeychainKey() } }
                    Spacer()
                    Button("Forget Key…", role: .destructive) { confirmForget = true }
                }.disabled(model.connectionBusy)
                Text("Optional. Only these actions or saving a new key can open Keychain. macOS may ask for permission; startup and monitoring never open it.")
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
                Text("One sampler serves the window and menu bar. Hidden views update less often; icon-only mode stops hidden sampling. Sleep and pause stop updates. Low Power Mode reduces refresh frequency.")
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
                Button("Copy Diagnostics") { model.copyDiagnostics() }
                Text("Diagnostics contain version and connection state, not keys, prompts, model names, or request data. No analytics. Update checks use public GitHub release information.")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }.formStyle(.grouped).padding(8).frame(width: 560)
            .onAppear { endpoint = model.endpoint }
            .confirmationDialog("Remove OMLX Scope’s saved API key?", isPresented: $confirmForget) {
                Button("Forget Key", role: .destructive) { Task { await model.forgetKey() } }
                Button("Cancel", role: .cancel) {}
            } message: { Text("macOS may ask for Keychain authorization. OpenCode credentials are not deleted. Automatic reuse is disabled until you choose Use OpenCode Connection.") }
    }
}
