import Foundation

public enum Phase: String, Sendable, CaseIterable {
    case offline, connecting, idle, noModel, queued, prefill, decode, processing, unknown
    public var title: String {
        switch self {
        case .offline: "Offline"
        case .connecting: "Connecting"
        case .idle: "Ready"
        case .noModel: "No model loaded"
        case .queued: "Queued"
        case .prefill: "Reading context"
        case .decode: "Generating"
        case .processing: "Processing"
        case .unknown: "Unavailable"
        }
    }
}

/// Display-only values. Request IDs, prompts, and credentials are never retained here.
public struct RuntimeReading: Sendable, Equatable {
    public var phase: Phase = .connecting
    public var model: String?
    public var rate: Double?
    public var active: Double?
    public var queued: Double?
    public var prompt: Double?
    public var reused: Double?
    public var output: Double?
    public var prefillProcessed: Double?
    public var prefillTotal: Double?
    public var prefillETA: Double?
    public var progressStale = false
    public var progress: Double?
    public var elapsed: Double?
    public var modelBytes: Double?
    public var processBytes: Double?
    public var ramCacheBytes: Double?
    public var ssdCacheBytes: Double?
    public var prefillAverage: Double?
    public var decodeAverage: Double?
    public var cacheEfficiency: Double?
    public var statsFresh = false
    public var message = "Connect to your local oMLX server."
    public var sampledAt = Date()
    public var epoch = 0
    public init() {}
    public var connected: Bool { phase != .offline && phase != .connecting }
    public var hasActivity: Bool { [.decode, .prefill, .processing, .queued].contains(phase) }
    public static func unavailable(_ message: String) -> Self {
        var result = Self(); result.phase = .offline; result.message = message; return result
    }
}

public struct HostReading: Sendable, Equatable {
    public var cpu: Double?
    public var totalBytes: Double?
    public var nonFreeBytes: Double?
    public var wiredBytes: Double?
    public var compressedBytes: Double?
    public var swapBytes: Double?
    public var batteryPercent: Double?
    public var powerSource: String?
    public var thermal: String?
    public var lowPower = false
    public var sampledAt = Date()
    public init() {}
    public var memoryPercent: Double? {
        guard let totalBytes, let nonFreeBytes, totalBytes > 0,
              nonFreeBytes >= 0, nonFreeBytes <= totalBytes else { return nil }
        return nonFreeBytes / totalBytes * 100
    }
}

public enum DisplayFormat {
    public static func number(_ value: Double?, digits: Int = 1) -> String {
        guard let value, value.isFinite, value >= 0 else { return "—" }
        return value.formatted(.number.precision(.fractionLength(digits)))
    }
    public static func bytes(_ value: Double?) -> String {
        guard let value, value.isFinite, value >= 0 else { return "—" }
        return number(value / 1_073_741_824) + " GiB"
    }
    public static func percent(_ value: Double?) -> String {
        guard let value, value.isFinite, value >= 0, value <= 100 else { return "—" }
        return number(value, digits: 0) + "%"
    }
    public static func tokens(_ value: Double?) -> String {
        guard let value, value.isFinite, value >= 0 else { return "—" }
        return value.formatted(.number.precision(.fractionLength(0)))
    }
}
