import Foundation

/// Counter-based output measurement, shared by all native views. No timers or I/O.
public struct ObservedOutput: Sendable {
    private struct Sample: Sendable { let time: TimeInterval; let tokens: Double }
    private var samples: [Sample] = []
    private var identity: Int?
    private var elapsed: Double?
    public init() {}
    public mutating func clear() { samples.removeAll(keepingCapacity: true); identity = nil; elapsed = nil }
    public mutating func observe(_ reading: RuntimeReading, at time: TimeInterval) -> Double? {
        guard reading.phase == .decode, reading.rate == nil, (reading.active ?? 0) <= 1,
              let count = reading.output, count.isFinite, count > 0, count.rounded() == count,
              count <= 9_007_199_254_740_991, time.isFinite else { clear(); return nil }
        if identity != reading.epoch || samples.last.map({ time < $0.time || time - $0.time > 12 || count < $0.tokens }) == true
            || (elapsed != nil && reading.elapsed != nil && reading.elapsed! < elapsed!) { clear() }
        identity = reading.epoch; elapsed = reading.elapsed
        if samples.last?.time != time { samples.append(Sample(time: time, tokens: count)) }
        samples.removeAll { time - $0.time > 10 }
        if samples.count > 24 { samples.removeFirst(samples.count - 24) }
        guard let first = samples.first, let last = samples.last, samples.count >= 3, last.time - first.time >= 2 else { return nil }
        return (last.tokens - first.tokens) / (last.time - first.time)
    }
}
