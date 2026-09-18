import Foundation

public enum ProgressDisplay: String, CaseIterable, Identifiable, Sendable {
    case remaining = "Remaining", completed = "Completed"
    public var id: String { rawValue }
}

/// Current-stage work only. Reused input must not be subtracted from these counters.
public struct PrefillReading: Sendable, Equatable {
    public let fraction: Double
    public let remaining: String
    public let completed: String
    public let counts: String?
    public let estimate: String?
    public let held: Bool
    public init?(_ reading: RuntimeReading) {
        guard reading.phase == .prefill else { return nil }
        let ratio: Double
        if reading.prefillProcessed != nil || reading.prefillTotal != nil {
            guard let done = reading.prefillProcessed, let total = reading.prefillTotal,
                  done.isFinite, total.isFinite, done >= 0, total > 0, done <= total,
                  done.rounded() == done, total.rounded() == total,
                  total <= 9_007_199_254_740_991 else { return nil }
            ratio = done / total
            counts = "\(DisplayFormat.tokens(done)) / \(DisplayFormat.tokens(total)) tokens · \(DisplayFormat.tokens(total - done)) left"
        } else {
            guard let progress = reading.progress, progress.isFinite, (0...1).contains(progress) else { return nil }
            ratio = progress; counts = nil
        }
        fraction = ratio
        let whole = ratio >= 1 ? 100 : min(99, Int(floor(ratio * 100 + 1e-10)))
        completed = "\(whole)%"
        remaining = ratio > 0.99 && ratio < 1 ? "<1%" : "\(100 - whole)%"
        held = reading.progressStale
        if !held, ratio < 1, let seconds = reading.prefillETA, seconds.isFinite, seconds >= 0,
           let speed = reading.rate, speed.isFinite, speed > 0 {
            if seconds < 1 { estimate = "<1s" }
            else if seconds < 60 { estimate = "~\(Int(ceil(seconds / 5) * 5))s" }
            else if seconds < 3600 { estimate = "~\(Int(ceil(seconds / 60)))m" }
            else if seconds < 86400 { estimate = "~\(DisplayFormat.number(seconds / 3600))h" }
            else { estimate = ">24h" }
        } else { estimate = nil }
    }
    public func menuText(_ display: ProgressDisplay) -> String {
        (display == .remaining ? remaining + " left" : completed + " done") + (held ? "*" : "")
    }
}
