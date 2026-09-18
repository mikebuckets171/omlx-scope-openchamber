import AppKit
import SwiftUI
import ScopeCore
import ScopeMac

// Developer-only native SwiftUI previews. Not part of OMLXScope.app.
@MainActor
func renderPreviews() throws {
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
    func export<V: View>(_ view: V, name: String, width: CGFloat, scheme: ColorScheme) throws {
        let canvas = view.environment(\.colorScheme, scheme).preferredColorScheme(scheme)
            .background(scheme == .dark ? Color(nsColor: .windowBackgroundColor) : Color.white)
        let renderer = ImageRenderer(content: canvas); renderer.proposedSize = ProposedViewSize(width: width, height: nil); renderer.scale = 2
        guard let image = renderer.cgImage else { throw NSError(domain: "ScopePreview", code: 1) }
        let bitmap = NSBitmapImageRep(cgImage: image)
        guard let data = bitmap.representation(using: .png, properties: [:]) else { throw NSError(domain: "ScopePreview", code: 2) }
        try data.write(to: root.appendingPathComponent(name + ".png"))
        print("Rendered \(name): \(image.width) × \(image.height)")
    }
    for scheme in [ColorScheme.dark, .light] {
        NSApp.appearance = NSAppearance(named: scheme == .dark ? .darkAqua : .aqua)
        let theme = scheme == .dark ? "dark" : "light"
        try export(VStack(alignment: .leading, spacing: 22) {
            HStack { Text("OMLX Scope").font(.title2.weight(.semibold)); Spacer(); Text("Preview data").font(.caption).foregroundStyle(.secondary) }
            OverviewContent(model: model)
        }.padding(30).frame(width: 850), name: "overview-\(theme)", width: 850, scheme: scheme)
        try export(MenuPopover(model: model), name: "menu-\(theme)", width: 345, scheme: scheme)
        try export(ResourcesContent(model: model).padding(28).frame(width: 850), name: "resources-\(theme)", width: 850, scheme: scheme)
    }
    model.togglePause()
    try export(MenuPopover(model: model), name: "menu-paused", width: 345, scheme: .light)
    model.togglePause(); model.runtime = .unavailable("oMLX is not responding. Host resources are still available.")
    try export(MenuPopover(model: model), name: "menu-offline", width: 345, scheme: .light)
}

let application = NSApplication.shared
Task { @MainActor in
    do { try renderPreviews(); exit(0) }
    catch { fputs("Native preview rendering failed: \(error)\n", stderr); exit(1) }
}
application.run()
