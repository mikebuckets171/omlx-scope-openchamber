import AppKit
import SwiftUI

public struct UpdatesView: View {
    @Bindable var updates: UpdateController
    public init(updates: UpdateController) { self.updates = updates }
    public var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 14) {
                Image(systemName: "arrow.triangle.2.circlepath.circle")
                    .font(.system(size: 38, weight: .light)).foregroundStyle(.tint)
                VStack(alignment: .leading, spacing: 4) {
                    Text("OMLX Scope").font(.title2.weight(.semibold))
                    Text("Installed · \(updates.versionLabel)").font(.subheadline).foregroundStyle(.secondary)
                }
            }
            Divider()
            HStack(alignment: .top, spacing: 12) {
                if updates.state == .checking { ProgressView().controlSize(.small) }
                Text(updates.status).font(.headline).fixedSize(horizontal: false, vertical: true)
            }.accessibilityElement(children: .combine)
            if let date = updates.lastChecked {
                Text("Last checked \(date.formatted(date: .abbreviated, time: .shortened))")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Toggle("Check for updates automatically", isOn: $updates.automaticallyChecks)
            if updates.secureInstallation {
                Toggle("Download and install updates automatically", isOn: $updates.automaticallyInstalls)
            } else {
                Text("Preview build · automatic installation is unavailable. Download releases from GitHub and replace the app manually. This build is not notarized.")
                    .font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
            Text("Checks contact GitHub for public release information. No model data, prompts, or oMLX credentials are sent.")
                .font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            HStack {
                Button("View Releases") { updates.openRelease() }
                Spacer()
                Button("Check for Updates…") { updates.check() }
                    .buttonStyle(.borderedProminent).disabled(!updates.canCheck)
            }
        }.padding(28).frame(width: 460)
    }
}

public struct CheckForUpdatesButton: View {
    let updates: UpdateController
    @Environment(\.openWindow) private var openWindow
    public init(updates: UpdateController) { self.updates = updates }
    public var body: some View {
        Button("Check for Updates…") {
            if !updates.secureInstallation { openWindow(id: "updates"); NSApp.activate(ignoringOtherApps: true) }
            updates.check()
        }.disabled(!updates.canCheck)
    }
}
