import Foundation
import CoreFoundation

typealias Object = [String: Any]
func object(_ value: Any?) -> Object { value as? Object ?? [:] }
func objects(_ value: Any?) -> [Object] { value as? [Object] ?? [] }
func nonnegative(_ value: Any?) -> Double? {
    guard let n = value as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID(),
          n.doubleValue.isFinite, n.doubleValue >= 0 else { return nil }
    return n.doubleValue
}
func string(_ value: Any?) -> String? {
    guard let s = value as? String else { return nil }
    let trimmed = s.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : String(trimmed.prefix(300))
}

public enum Normalizer {
    public static func reading(activity: Data, stats: Data?, now: Date = Date()) throws -> RuntimeReading {
        let root = object(try JSONSerialization.jsonObject(with: activity))
        guard let active = root["active_models"] as? Object,
              let models = active["models"] as? [Object] else { throw ConnectionError.malformed }
        let rawStats = stats.flatMap { try? JSONSerialization.jsonObject(with: $0) }
        let session = object(rawStats)
        let statsValid = session["engines"] is Object && session["active_models"] is Object
        let cache = statsValid ? object(session["runtime_cache"]) : [:]
        var result = RuntimeReading(); result.sampledAt = now; result.statsFresh = statsValid
        result.phase = models.isEmpty ? .noModel : .unknown
        result.message = models.isEmpty ? "Server connected. Load a model in oMLX to begin." : "Detailed activity is not reported."
        result.active = models.isEmpty ? 0 : nonnegative(active["total_active_requests"])
        if result.active == nil, models.allSatisfy({ nonnegative($0["active_requests"]) != nil }) {
            result.active = models.reduce(0) { $0 + nonnegative($1["active_requests"])! }
        }
        result.queued = nonnegative(active["total_waiting_requests"])
        if result.queued == nil, models.allSatisfy({ nonnegative($0["waiting_requests"]) != nil }) {
            result.queued = models.reduce(0) { $0 + nonnegative($1["waiting_requests"])! }
        }
        // Subtract only overlap proven by the runtime's request identifiers.
        var overlap = 0
        for model in models {
            let ids = Set(["prefilling", "generating", "activities"].flatMap { objects(model[$0]) }.compactMap { string($0["request_id"]) })
            overlap += objects(model["waiting"]).filter { entry in
                string(entry["request_id"]).map { ids.contains($0) } ?? false
            }.count
        }
        result.queued = result.queued.map { max(0, $0 - Double(overlap)) }
        let model = models.first { !objects($0["generating"]).isEmpty }
            ?? models.first { !objects($0["prefilling"]).isEmpty }
            ?? models.first { (nonnegative($0["active_requests"]) ?? 0) > 0 }
            ?? models.first { $0["is_loading"] as? Bool == true } ?? models.first
        if let model {
            result.model = string(model["id"])
            result.modelBytes = nonnegative(model["actual_size"])
            let generating = objects(model["generating"]), prefilling = objects(model["prefilling"])
            let activeModels = models.filter { !objects($0["generating"]).isEmpty || !objects($0["prefilling"]).isEmpty || (nonnegative($0["active_requests"]) ?? 0) > 0 }.count
            if activeModels > 1 || (result.active ?? 0) > 1 || generating.count + prefilling.count > 1 {
                result.phase = .processing; result.message = "Concurrent requests. Per-request speed is not combined."
            } else if let flight = generating.first {
                result.output = nonnegative(flight["generated_tokens"])
                result.elapsed = nonnegative(flight["elapsed_seconds"])
                result.prompt = nonnegative(flight["prompt_tokens"])
                if let age = nonnegative(flight["last_activity_age_seconds"]), age <= 5,
                   (result.output ?? 0) > 0, (result.elapsed ?? 0) > 0 {
                    result.phase = .decode; result.rate = nonnegative(flight["tokens_per_second"])
                    result.message = "Current request average · not instantaneous speed"
                } else {
                    result.phase = .processing; result.message = "Waiting for fresh output from the active request."
                }
            } else if let flight = prefilling.first {
                result.phase = .prefill; result.rate = nonnegative(flight["speed"])
                result.prompt = nonnegative(flight["prompt_tokens"])
                result.reused = nonnegative(flight["cached_tokens"])
                result.elapsed = nonnegative(flight["elapsed"])
                if let total = nonnegative(flight["total"]), total > 0, let done = nonnegative(flight["processed"]) {
                    result.progress = min(1, done / total)
                }
                result.message = "Reading context · reported prefill average"
            } else if model["is_loading"] as? Bool == true || (result.active ?? 0) > 0 || !objects(model["activities"]).isEmpty {
                result.phase = .processing; result.message = "Runtime is working. Token speed is not reported yet."
            } else if nonnegative(model["active_requests"]) == 0 {
                result.phase = (result.queued ?? 0) > 0 ? .queued : .idle
                result.message = result.phase == .idle ? "Model ready for the next request." : "Requests are waiting to run."
            }
        }
        if let reused = result.reused, result.prompt == nil || reused > result.prompt! { result.reused = nil }
        let pressure = object(active["memory_pressure"])
        if pressure["enabled"] as? Bool == true { result.processBytes = nonnegative(pressure["current_bytes"]) }
        result.ramCacheBytes = nonnegative(cache["hot_cache_size_bytes"])
        result.ssdCacheBytes = nonnegative(object(cache["cold_tier"])["physical_bytes"])
        if statsValid {
            result.decodeAverage = nonnegative(session["avg_generation_tps"])
            result.prefillAverage = nonnegative(session["avg_prefill_tps"])
            result.cacheEfficiency = nonnegative(session["cache_efficiency"]).flatMap { $0 <= 100 ? $0 : nil }
        }
        return result
    }

    /// Kept inside the collector, never exposed to views or logs.
    static func continuity(_ data: Data) -> (String, Double?) {
        guard let json = try? JSONSerialization.jsonObject(with: data) else { return ("", nil) }
        let models = objects(object(object(json)["active_models"])["models"])
        var parts: [String] = []; var progress: Double?
        for model in models {
            for phase in ["prefilling", "generating"] {
                for flight in objects(model[phase]) {
                    // JSON serialization prevents ambiguous delimiter collisions.
                    let identity = [string(model["id"]) ?? "", phase, string(flight["request_id"]) ?? ""]
                    parts.append(String(data: (try? JSONSerialization.data(withJSONObject: identity)) ?? Data(), encoding: .utf8) ?? "")
                    if phase == "prefilling" { progress = nonnegative(flight["processed"]) }
                }
            }
        }
        return (parts.sorted().joined(separator: "\n"), progress)
    }
}
