import AppKit
import SwiftUI
import ScopeMac

@main
@MainActor
struct OMLXScopeApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var model = MonitorModel()
    var body: some Scene {
        WindowGroup("OMLX Scope", id: "monitor") {
            MonitorView(model: model).onAppear { model.start() }
        }
        .defaultSize(width: 1050, height: 780)
        .windowResizability(.contentMinSize)
        .commands {
            CommandGroup(after: .newItem) {
                Button(model.paused ? "Resume Monitoring" : "Pause Monitoring") { model.togglePause() }
                    .keyboardShortcut("p", modifiers: [.command, .shift])
                Button("Refresh Readings") { model.refresh() }.keyboardShortcut("r")
                    .disabled(model.paused || model.busy)
            }
        }
        MenuBarExtra { MenuPopover(model: model) } label: { MenuBarLabel(model: model) }
            .menuBarExtraStyle(.window)
        Settings { SettingsView(model: model) }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
}
