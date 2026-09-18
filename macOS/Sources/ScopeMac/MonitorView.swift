import SwiftUI
import ScopeCore

public struct MonitorView: View {
    @Bindable var model: MonitorModel
    @State private var selection: String? = "overview"
    @State private var viewID = UUID()
    @Environment(\.openSettings) private var openSettings
    public init(model: MonitorModel) { self.model = model }
    public var body: some View {
        NavigationSplitView {
            VStack(alignment: .leading, spacing: 24) {
                HStack(spacing: 10) {
                    Image(systemName: "waveform.path.ecg").font(.title2).foregroundStyle(.tint)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("OMLX Scope").font(.headline)
                        Text("Local, in view.").font(.caption).foregroundStyle(.secondary)
                    }
                }.padding(.horizontal, 18).padding(.top, 24)
                List(selection: $selection) {
                    Label("Overview", systemImage: "square.grid.2x2").tag("overview")
                    Label("Resources", systemImage: "cpu").tag("resources")
                }.listStyle(.sidebar)
                VStack(alignment: .leading, spacing: 10) {
                    StatusLabel(model: model)
                    Text("Read-only monitoring").font(.caption).foregroundStyle(.tertiary)
                }.padding(18)
            }.navigationSplitViewColumnWidth(min: 175, ideal: 195, max: 240)
        } detail: {
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    HStack(alignment: .firstTextBaseline) {
                        VStack(alignment: .leading, spacing: 7) {
                            Text(selection == "resources" ? "Your Mac" : "Overview").font(.system(size: 30, weight: .semibold, design: .rounded))
                            Text(selection == "resources" ? model.hardware : "Your model and machine, together.")
                                .font(.subheadline).foregroundStyle(.secondary)
                        }
                        Spacer(); Text(model.sampleAge).font(.caption).foregroundStyle(.secondary)
                    }
                    if selection == "resources" { ResourcesContent(model: model) }
                    else { OverviewContent(model: model) }
                    HStack {
                        Text("OMLX Scope 0.5.2"); Spacer(); Text("On-device · no analytics")
                    }.font(.caption2).foregroundStyle(.tertiary)
                }.padding(28).frame(maxWidth: 1150)
                    .frame(maxWidth: .infinity)
            }
            .toolbar {
                ToolbarItemGroup {
                    Button { model.togglePause() } label: { Label(model.paused ? "Resume" : "Pause", systemImage: model.paused ? "play" : "pause") }
                        .help("Pause monitoring, not your model")
                    Button { model.refresh() } label: { Label("Refresh", systemImage: "arrow.clockwise") }
                        .disabled(model.paused || model.busy).help("Refresh readings")
                    Button { openSettings() } label: { Label("Connection", systemImage: "slider.horizontal.3") }.help("Connection and appearance settings")
                }
            }
        }
        .frame(minWidth: 760, minHeight: 560)
        .background(WindowPresence { model.setVisible(viewID, $0) }.frame(width: 0, height: 0))
        .onDisappear { model.setVisible(viewID, false) }
    }
}

public struct OverviewContent: View {
    let model: MonitorModel
    public init(model: MonitorModel) { self.model = model }
    public var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            VStack(alignment: .leading, spacing: 16) {
                HStack { StatusLabel(model: model); Spacer(); Text("oMLX").font(.caption.weight(.medium)).foregroundStyle(.secondary) }
                Text(model.runtime.model?.split(separator: "/").last.map(String.init) ?? "Your local model")
                    .font(.headline).lineLimit(2).help(model.runtime.model ?? "No model reported")
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text(model.runtime.rate != nil && !model.paused ? DisplayFormat.number(model.runtime.rate) : model.paused ? "Paused" : model.runtime.phase == .idle ? "Ready" : "—")
                        .font(.system(size: 66, weight: .light, design: .rounded)).monospacedDigit().contentTransition(.identity)
                    if model.runtime.rate != nil && !model.paused { Text("tokens / second").font(.subheadline).foregroundStyle(.secondary) }
                }
                Text(model.paused ? "Readings are held. Your model is not paused." : model.runtime.message)
                    .font(.subheadline).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                if let progress = model.runtime.progress, model.runtime.phase == .prefill {
                    ProgressView(value: progress).accessibilityLabel("Context read \(Int(progress * 100)) percent")
                }
                HistoryPlot(history: model.speedHistory, height: 104, caption: model.paused ? "Paused history" : "Request average · tok/s")
                Divider()
                HStack(alignment: .top, spacing: 24) {
                    MetricValue(title: "Active requests", value: DisplayFormat.tokens(model.runtime.active))
                    MetricValue(title: "Output tokens", value: DisplayFormat.tokens(model.runtime.output))
                    MetricValue(title: "Queued", value: DisplayFormat.tokens(model.runtime.queued))
                }
            }.padding(24).background(.quaternary.opacity(0.24), in: RoundedRectangle(cornerRadius: 18))
            HStack(alignment: .top, spacing: 22) {
                Surface(title: "Host resources") {
                    HStack { MetricValue(title: "CPU", value: DisplayFormat.percent(model.host.cpu)); MetricValue(title: "Non-free RAM", value: DisplayFormat.percent(model.host.memoryPercent)) }
                    HistoryPlot(history: model.cpuHistory, ceiling: 100, height: 55, caption: "CPU · 0–100%")
                    ReadingRow(title: "Swap used", value: DisplayFormat.bytes(model.host.swapBytes))
                    ReadingRow(title: "Thermal state", value: model.host.thermal ?? "—")
                }
                Surface(title: "Server averages") {
                    ReadingRow(title: "Generation", value: rate(model.runtime.decodeAverage))
                    ReadingRow(title: "Context reading", value: rate(model.runtime.prefillAverage))
                    ReadingRow(title: "Cache efficiency", value: DisplayFormat.percent(model.runtime.cacheEfficiency))
                    Text(model.runtime.statsFresh && !model.paused ? "Completed requests across all models." : "Last available totals · not live")
                        .font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
    private func rate(_ value: Double?) -> String { value == nil ? "—" : DisplayFormat.number(value) + " tok/s" }
}

public struct ResourcesContent: View {
    let model: MonitorModel
    public init(model: MonitorModel) { self.model = model }
    public var body: some View {
        VStack(spacing: 22) {
            Surface(title: "CPU") {
                MetricValue(title: "Whole-host load", value: DisplayFormat.percent(model.host.cpu))
                HistoryPlot(history: model.cpuHistory, ceiling: 100, height: 90, caption: "CPU · 0–100%")
            }
            Surface(title: "Memory") {
                HStack(spacing: 20) {
                    MetricValue(title: "Non-free RAM", value: DisplayFormat.bytes(model.host.nonFreeBytes))
                    MetricValue(title: "Physical memory", value: DisplayFormat.bytes(model.host.totalBytes))
                }
                HistoryPlot(history: model.memoryHistory, ceiling: 100, height: 72, tint: .purple, caption: "Memory occupancy · 0–100%")
                HStack(spacing: 20) {
                    MetricValue(title: "Wired", value: DisplayFormat.bytes(model.host.wiredBytes))
                    MetricValue(title: "Compressed", value: DisplayFormat.bytes(model.host.compressedBytes))
                    MetricValue(title: "Swap used", value: DisplayFormat.bytes(model.host.swapBytes))
                }
                Text("Non-free RAM is physical memory minus free pages, including reclaimable memory. It is not Activity Monitor’s Memory Used or memory pressure. Compressed memory is physical storage; allocated swap does not prove active swapping.")
                    .font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
            HStack(alignment: .top, spacing: 22) {
                Surface(title: "oMLX memory") {
                    ReadingRow(title: "Process footprint", value: DisplayFormat.bytes(model.runtime.processBytes))
                    ReadingRow(title: "Model allocation", value: DisplayFormat.bytes(model.runtime.modelBytes))
                    ReadingRow(title: "RAM cache", value: DisplayFormat.bytes(model.runtime.ramCacheBytes))
                    ReadingRow(title: "SSD cache", value: DisplayFormat.bytes(model.runtime.ssdCacheBytes))
                    Text("Reported by oMLX; categories may overlap.").font(.caption).foregroundStyle(.secondary)
                }
                Surface(title: "Power") {
                    ReadingRow(title: "Source", value: model.host.powerSource ?? "—")
                    ReadingRow(title: "Battery", value: DisplayFormat.percent(model.host.batteryPercent))
                    ReadingRow(title: "Low Power Mode", value: model.host.lowPower ? "On" : "Off")
                    ReadingRow(title: "Thermal state", value: model.host.thermal ?? "—")
                    Text("System-reported state, not a temperature reading.").font(.caption).foregroundStyle(.secondary)
                }
            }
        }
    }
}
