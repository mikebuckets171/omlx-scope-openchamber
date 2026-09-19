import SwiftUI
import AppKit
import ScopeCore

public struct MenuPopover: View {
    let model: MonitorModel
    let updates: UpdateController?
    @State private var viewID = UUID()
    @Environment(\.openWindow) private var openWindow
    @Environment(\.openSettings) private var openSettings
    public init(model: MonitorModel, updates: UpdateController? = nil) { self.model = model; self.updates = updates }
    public var body: some View {
        VStack(alignment: .leading, spacing: 17) {
            HStack {
                Label("OMLX Scope", systemImage: "waveform.path.ecg").font(.headline)
                Spacer(); StatusLabel(model: model)
            }
            Text(model.runtime.model?.split(separator: "/").last.map(String.init) ?? "Your local model")
                .font(.subheadline).foregroundStyle(.secondary).lineLimit(1).truncationMode(.middle)
                .help(model.runtime.model ?? "No model reported")
            if let progress = model.prefill {
                PrefillCard(reading: progress, paused: model.paused, compact: true)
            } else {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(model.paused ? "Paused" : model.displayRate == nil ? model.runtime.phase == .idle ? "Ready" : "—" : DisplayFormat.number(model.displayRate))
                    .font(.system(size: 43, weight: .light, design: .rounded)).monospacedDigit()
                if model.displayRate != nil && !model.paused { Text("tok/s").foregroundStyle(.secondary).font(.subheadline) }
                Spacer()
                VStack(alignment: .trailing, spacing: 5) {
                    Text(DisplayFormat.tokens(model.runtime.active) + " active").font(.subheadline)
                    Text(model.runtime.rate == nil && model.runtime.observedRate != nil ? "Recent output" : "Request average").font(.caption2).foregroundStyle(.tertiary)
                }
            }
            HistoryPlot(history: model.speedHistory, height: 48, caption: model.paused ? "Paused" : "Observed · 90s")
            }
            if model.runtime.phase == .prefill && model.prefill == nil {
                Text("Prefill active · percentage not reported").font(.caption).foregroundStyle(.secondary)
            }
            Divider()
            VStack(spacing: 3) {
                if model.runtime.phase == .prefill {
                    ReadingRow(title: "Context reading", value: model.paused || model.displayRate == nil ? "—" : DisplayFormat.number(model.displayRate) + " tok/s")
                }
                if let remaining = model.runtime.contextRemaining {
                    ReadingRow(title: "Tokens to model limit", value: DisplayFormat.tokens(remaining))
                }
                if let reused = model.runtime.inputReusedPercent {
                    ReadingRow(title: "Input reused", value: DisplayFormat.percent(reused))
                }
                ReadingRow(title: "CPU", value: DisplayFormat.percent(model.host.cpu))
                ReadingRow(title: "Non-free RAM", value: DisplayFormat.bytes(model.host.nonFreeBytes))
                ReadingRow(title: "Swap used", value: DisplayFormat.bytes(model.host.swapBytes))
            }
            if model.runtime.phase == .decode || model.runtime.phase == .processing, let output = model.runtime.output {
                ReadingRow(title: "Output tokens", value: DisplayFormat.tokens(output))
            }
            if !model.runtime.connected || model.runtime.hasActivity && model.runtime.rate == nil {
                Text(model.runtime.observedRate != nil ? model.rateCaption : model.runtime.message).font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
            Divider()
            HStack(spacing: 10) {
                Button("Open Monitor") { openWindow(id: "monitor"); NSApp.activate(ignoringOtherApps: true) }
                    .buttonStyle(.borderedProminent).controlSize(.small)
                Spacer()
                Button { model.togglePause() } label: { Image(systemName: model.paused ? "play" : "pause") }
                    .help(model.paused ? "Resume monitoring" : "Pause monitoring").accessibilityLabel(model.paused ? "Resume monitoring" : "Pause monitoring")
                Menu {
                    Button("Settings…") { openSettings(); NSApp.activate(ignoringOtherApps: true) }
                    Button("Refresh") { model.refresh() }.disabled(model.paused || model.busy)
                    if let updates { CheckForUpdatesButton(updates: updates) }
                    Button("Copy Diagnostics") { model.copyDiagnostics() }
                    Divider()
                    Button("Quit OMLX Scope") { NSApp.terminate(nil) }.keyboardShortcut("q")
                } label: { Image(systemName: "ellipsis") }
                    .menuStyle(.borderlessButton).fixedSize().help("More options").accessibilityLabel("More options")
            }
            Text(model.sampleAge).font(.caption2).foregroundStyle(.tertiary)
        }.padding(20).frame(width: 345)
            .background(WindowPresence { model.setVisible(viewID, $0) }.frame(width: 0, height: 0))
            .onDisappear { model.setVisible(viewID, false) }
    }
}

public struct MenuBarLabel: View {
    let model: MonitorModel
    public init(model: MonitorModel) { self.model = model }
    public var body: some View {
        HStack(spacing: 5) {
            Image(systemName: model.paused ? "pause.circle" : model.runtime.phase == .prefill && model.menuReadout == .speed ? "text.alignleft" : "waveform.path.ecg")
            if model.menuReadout != .icon {
                Text(model.menuText).font(.system(size: 11, weight: .medium, design: .monospaced)).frame(width: 79, alignment: .trailing)
            }
        }.accessibilityLabel("OMLX Scope, \(model.statusText), \(model.menuText)\(model.runtime.progressStale ? ", last reading; not live" : "")")
    }
}
