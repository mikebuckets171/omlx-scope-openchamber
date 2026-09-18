import AppKit
import SwiftUI
import ScopeCore
import ScopeMac

// Developer-only native previews. Not part of OMLXScope.app.
@MainActor
func renderPreviews() async throws {
    guard CommandLine.arguments.count == 2 else { fatalError("Pass an output directory.") }
    let root = URL(fileURLWithPath: CommandLine.arguments[1])
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    var runtime = RuntimeReading()
    runtime.phase = .decode; runtime.model = "Qwen · local model"; runtime.rate = 24.8
    runtime.active = 1; runtime.queued = 0; runtime.output = 1344; runtime.elapsed = 54.2
    runtime.decodeAverage = 23.1; runtime.prefillAverage = 310; runtime.cacheEfficiency = 81
    runtime.modelBytes = 18_600_000_000; runtime.processBytes = 31_000_000_000
    runtime.ramCacheBytes = 2_500_000_000; runtime.ssdCacheBytes = 24_000_000_000
    runtime.statsFresh = true; runtime.message = "Current request average · not instantaneous speed"
    var host = HostReading()
    host.cpu = 18; host.totalBytes = 48 * 1_073_741_824; host.nonFreeBytes = 36.7 * 1_073_741_824
    host.wiredBytes = 27.1 * 1_073_741_824; host.compressedBytes = 2.1 * 1_073_741_824
    host.swapBytes = 1.2 * 1_073_741_824; host.thermal = "Nominal"
    host.batteryPercent = 92; host.powerSource = "Power adapter"
    let model = MonitorModel(preview: true)
    let rates: [Double?] = (0..<90).map { i in
        let wave = sin(Double(i) / 8.0)
        let ripple = cos(Double(i) / 3.0) * 0.4
        return 23.6 + wave + ripple
    }
    model.setPreview(runtime: runtime, host: host, rates: rates)
    func export<V: View>(_ view: V, name: String, width: CGFloat, scheme: ColorScheme) async throws {
        let appearance = NSAppearance(named: scheme == .dark ? .darkAqua : .aqua)!
        let canvas = view.environment(\.colorScheme, scheme).preferredColorScheme(scheme)
            .background(Color(nsColor: .windowBackgroundColor))
        let hosting = NSHostingView(rootView: canvas)
        hosting.appearance = appearance
        let fitting = hosting.fittingSize
        let size = NSSize(width: width, height: max(1, fitting.height))
        let window = NSWindow(contentRect: NSRect(origin: .zero, size: size),
                              styleMask: [.borderless], backing: .buffered, defer: false)
        window.isReleasedWhenClosed = false
        window.appearance = appearance
        window.contentView = hosting
        hosting.frame = NSRect(origin: .zero, size: size)
        window.setContentSize(size)
        window.orderFrontRegardless()
        defer { window.orderOut(nil); window.close() }
        // Yield to SwiftUI/AppKit layout work; a nested synchronous run loop is insufficient.
        try await Task.sleep(for: .milliseconds(350))
        hosting.layoutSubtreeIfNeeded()
        window.displayIfNeeded()
        let target = root.appendingPathComponent(name + ".png")
        // Capture the actual test window when allowed. Never change system permissions.
        let capture = Process()
        capture.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
        capture.arguments = ["-x", "-o", "-l", String(window.windowNumber), target.path]
        capture.standardOutput = FileHandle.nullDevice
        capture.standardError = FileHandle.nullDevice
        try capture.run()
        let deadline = ProcessInfo.processInfo.systemUptime + 5
        while capture.isRunning && ProcessInfo.processInfo.systemUptime < deadline {
            try await Task.sleep(for: .milliseconds(50))
        }
        if capture.isRunning { capture.terminate(); throw NSError(domain: "ScopePreview", code: 2) }
        if capture.terminationStatus == 0, FileManager.default.fileExists(atPath: target.path) {
            print("Window capture \(name): \(Int(size.width)) × \(Int(size.height)) points")
            return
        }
        // Some CI hosts deny screen recording. Keep the limited view capture explicit.
        var png: Data?
        appearance.performAsCurrentDrawingAppearance {
            guard let bitmap = hosting.bitmapImageRepForCachingDisplay(in: hosting.bounds) else { return }
            hosting.cacheDisplay(in: hosting.bounds, to: bitmap)
            png = bitmap.representation(using: .png, properties: [:])
        }
        guard let png else { throw NSError(domain: "ScopePreview", code: 1) }
        try png.write(to: target)
        print("View-cache fallback \(name): screen capture unavailable; native materials may be incomplete")
    }
    for scheme in [ColorScheme.dark, .light] {
        NSApp.appearance = NSAppearance(named: scheme == .dark ? .darkAqua : .aqua)
        let theme = scheme == .dark ? "dark" : "light"
        try await export(VStack(alignment: .leading, spacing: 22) {
            HStack { Text("OMLX Scope").font(.title2.weight(.semibold)); Spacer(); Text("Preview data").font(.caption).foregroundStyle(.secondary) }
            OverviewContent(model: model)
        }.padding(30).frame(width: 850), name: "overview-\(theme)", width: 850, scheme: scheme)
        try await export(MonitorView(model: model).frame(width: 1050, height: 780), name: "workspace-\(theme)", width: 1050, scheme: scheme)
        try await export(MenuPopover(model: model), name: "menu-\(theme)", width: 345, scheme: scheme)
        try await export(ResourcesContent(model: model).padding(28).frame(width: 850), name: "resources-\(theme)", width: 850, scheme: scheme)
        var prefill = runtime
        prefill.phase = .prefill; prefill.rate = 240; prefill.progress = 0.64
        prefill.prefillProcessed = 5824; prefill.prefillTotal = 9100; prefill.prefillETA = 13.65
        prefill.output = nil; prefill.message = "Reading context · reported prefill average"
        model.runtime = prefill; model.menuReadout = .speed; model.progressDisplay = .remaining
        try await export(MenuPopover(model: model), name: "menu-prefill-\(theme)", width: 345, scheme: scheme)
        try await export(MenuBarLabel(model: model).padding(8).frame(width: 150, height: 38), name: "menubar-prefill-\(theme)", width: 150, scheme: scheme)
        try await export(OverviewContent(model: model).padding(24).frame(width: 850), name: "overview-prefill-\(theme)", width: 850, scheme: scheme)
        model.runtime.progressStale = true
        try await export(MenuPopover(model: model), name: "menu-prefill-held-\(theme)", width: 345, scheme: scheme)
        model.runtime = runtime
    }
    model.togglePause()
    try await export(MenuPopover(model: model), name: "menu-paused", width: 345, scheme: .light)
    model.togglePause(); model.runtime = .unavailable("oMLX is not responding. Host resources are still available.")
    try await export(MenuPopover(model: model), name: "menu-offline", width: 345, scheme: .light)
}

let application = NSApplication.shared
Task { @MainActor in
    do { try await renderPreviews(); exit(0) }
    catch { fputs("Native preview rendering failed: \(error)\n", stderr); exit(1) }
}
application.run()
