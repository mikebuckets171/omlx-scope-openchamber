import SwiftUI
import ScopeCore

struct MetricValue: View {
    let title: String
    let value: String
    var note: String? = nil
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(title).font(.subheadline).foregroundStyle(.secondary)
            Text(value).font(.system(size: 23, weight: .medium, design: .rounded)).monospacedDigit()
            if let note { Text(note).font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true) }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct StatusLabel: View {
    let model: MonitorModel
    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(model.paused ? Color.secondary : model.runtime.connected ? Color.green : Color.orange).frame(width: 6, height: 6)
            Text(model.statusText).font(.subheadline.weight(.medium))
        }.accessibilityElement(children: .combine)
    }
}

struct ReadingRow: View {
    let title: String
    let value: String
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title).foregroundStyle(.secondary)
            Spacer(minLength: 12)
            Text(value).monospacedDigit().multilineTextAlignment(.trailing)
        }.font(.subheadline).padding(.vertical, 5).accessibilityElement(children: .combine)
    }
}

struct HistoryPlot: View {
    let history: History
    var ceiling: Double? = nil
    var height: CGFloat = 100
    var tint: Color = .accentColor
    var caption = "Last 90 seconds"
    var body: some View {
        let points = history.points
        let upper = ceiling ?? max(1, (points.compactMap(\.value).max() ?? 0) * 1.2)
        let end = points.last?.time ?? Date()
        VStack(spacing: 6) {
            Canvas { context, size in
                var grid = Path()
                for fraction in [0.0, 0.5, 1.0] {
                    let y = 2 + (size.height - 4) * fraction
                    grid.move(to: CGPoint(x: 0, y: y)); grid.addLine(to: CGPoint(x: size.width, y: y))
                }
                context.stroke(grid, with: .color(.secondary.opacity(0.16)), style: StrokeStyle(lineWidth: 0.5, dash: [3, 4]))
                var trace = Path(); var previous: HistoryPoint?
                for point in points {
                    guard let value = point.value else { previous = nil; continue }
                    let age = end.timeIntervalSince(point.time)
                    guard age <= 90 else { previous = nil; continue }
                    let x = size.width * max(0, 1 - age / 90)
                    let y = 2 + (size.height - 4) * (1 - min(1, value / upper))
                    let position = CGPoint(x: x, y: y)
                    if let last = previous, last.segment == point.segment, point.time.timeIntervalSince(last.time) <= 12 {
                        trace.addLine(to: position)
                    } else { trace.move(to: position) }
                    previous = point
                }
                context.stroke(trace, with: .color(tint), style: StrokeStyle(lineWidth: 1.75, lineCap: .round, lineJoin: .round))
            }.frame(height: height)
                .accessibilityLabel("\(caption). \(points.compactMap(\.value).count) observations. Missing samples are gaps.")
            HStack {
                Text("−90s"); Spacer(); Text(caption); Spacer(); Text("latest")
            }.font(.system(size: 10)).foregroundStyle(.tertiary)
        }
    }
}

struct Surface<Content: View>: View {
    let title: String
    @ViewBuilder var content: () -> Content
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title).font(.headline)
            content()
        }.padding(22).frame(maxWidth: .infinity, alignment: .leading)
            .background(.quaternary.opacity(0.30), in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(.primary.opacity(0.055), lineWidth: 1))
    }
}
