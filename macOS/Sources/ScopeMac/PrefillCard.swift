import SwiftUI
import ScopeCore

struct PrefillCard: View {
    let reading: PrefillReading
    var paused = false
    var compact = false
    var body: some View {
        VStack(alignment: .leading, spacing: compact ? 10 : 14) {
            HStack(spacing: 14) {
                ZStack {
                    Circle().stroke(.quaternary, lineWidth: 4)
                    Circle().trim(from: 0, to: reading.fraction).stroke(.tint, style: StrokeStyle(lineWidth: 4, lineCap: .round)).rotationEffect(.degrees(-90))
                    Image(systemName: paused ? "pause" : "text.alignleft").font(.system(size: compact ? 13 : 17, weight: .medium)).foregroundStyle(.secondary)
                }.frame(width: compact ? 38 : 48, height: compact ? 38 : 48).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    Text(reading.remaining + " remaining").font(.system(size: compact ? 24 : 31, weight: .medium, design: .rounded)).monospacedDigit()
                    Text(reading.completed + " complete · current stage").font(.caption).foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
            }
            if let counts = reading.counts { Text(counts).font(.caption).monospacedDigit().foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true) }
            if paused || reading.held {
                Label(paused ? "Paused · last reading" : "Waiting for fresh progress", systemImage: "pause.circle").font(.caption).foregroundStyle(.secondary)
            } else if let estimate = reading.estimate {
                HStack {
                    Text("Estimated stage time left").foregroundStyle(.secondary)
                    Spacer(); Text(estimate).monospacedDigit().fontWeight(.medium)
                }.font(.caption)
            }
        }
        .padding(compact ? 14 : 20)
        .background(.tint.opacity(0.055), in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(.tint.opacity(0.15), lineWidth: 1))
        .accessibilityElement(children: .combine)
    }
}
