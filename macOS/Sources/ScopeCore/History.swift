import Foundation

public struct HistoryPoint: Sendable, Equatable {
    public let time: Date
    public let value: Double?
    public let segment: Int
    public init(time: Date, value: Double?, segment: Int) {
        self.time = time; self.value = value; self.segment = segment
    }
}

public struct History: Sendable {
    public private(set) var points: [HistoryPoint] = []
    public let duration: TimeInterval = 90
    public let limit = 180
    public init() {}
    public mutating func append(time: Date, value: Double?, segment: Int = 0) {
        if let last = points.last, time <= last.time { return }
        let safe = value.flatMap { $0.isFinite && $0 >= 0 ? $0 : nil }
        points.append(HistoryPoint(time: time, value: safe, segment: segment))
        points.removeAll { time.timeIntervalSince($0.time) > duration }
        if points.count > limit { points.removeFirst(points.count - limit) }
    }
    public mutating func clear() { points.removeAll(keepingCapacity: true) }
}

public enum SamplingPolicy {
    /// No timer or sampling while paused/asleep. No network for a hidden icon-only app.
    public static func interval(visible: Bool, active: Bool, lowPower: Bool,
                                efficient: Bool, failures: Int) -> TimeInterval {
        let base: Double = visible ? (efficient || lowPower ? 3 : (active ? 1 : 3)) : (lowPower || efficient ? 10 : 5)
        return failures > 0 ? max(base, min(30, pow(2, Double(min(5, failures))))) : base
    }
    public static func cpuPercent(previous: [UInt64]?, current: [UInt64]) -> Double? {
        guard let previous, previous.count == 4, current.count == 4,
              zip(current, previous).allSatisfy({ $0 >= $1 }) else { return nil }
        let delta = zip(current, previous).map { Double($0 - $1) }
        let total = delta.reduce(0, +)
        guard total > 0 else { return nil }
        return max(0, min(100, (total - delta[2]) / total * 100))
    }
}
