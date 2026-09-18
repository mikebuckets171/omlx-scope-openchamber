import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public struct HTTPResult: Sendable {
    public let data: Data
    public let status: Int
    public let url: URL
    public let sessionCookie: String?
    public init(data: Data, status: Int, url: URL, sessionCookie: String? = nil) {
        self.data = data; self.status = status; self.url = url; self.sessionCookie = sessionCookie
    }
}

public struct Connection: Equatable, Sendable {
    public let endpoint: Endpoint
    public let apiKey: String
    public init(endpoint: Endpoint, apiKey: String) { self.endpoint = endpoint; self.apiKey = apiKey }
}

/// No background loop: callers share one in-flight, read-only collection.
public actor OmlxClient {
    public typealias Transport = @Sendable (URLRequest) async throws -> HTTPResult
    private let transport: Transport
    private let clock: @Sendable () -> TimeInterval
    private var connection: Connection?
    private var cookie: String?
    private var verifiedAt = -Double.infinity
    private var statsAt = -Double.infinity
    private var stats: Data?
    private var statsHealthy = false
    private var pendingID = UUID()
    private var pending: Task<RuntimeReading, Never>?
    private var identity = ""
    private var epoch = 0
    private var processed: Double?
    private var changedAt: TimeInterval = 0

    public init(transport: @escaping Transport, clock: @escaping @Sendable () -> TimeInterval = { ProcessInfo.processInfo.systemUptime }) {
        self.transport = transport; self.clock = clock
    }

    public func cancel() { pending?.cancel() }

    public func snapshot(connection next: Connection) async -> RuntimeReading {
        // Serial consumer in the UI; simultaneous requests for the same connection coalesce.
        while let pending {
            let existingID = pendingID
            if connection == next {
                return await withTaskCancellationHandler { await pending.value } onCancel: { pending.cancel() }
            }
            pending.cancel()
            _ = await pending.value
            if pendingID == existingID { self.pending = nil }
        }
        if connection != next {
            connection = next; cookie = nil; verifiedAt = -.infinity
            statsAt = -.infinity; stats = nil; statsHealthy = false; identity = ""; processed = nil; epoch += 1
        }
        let task = Task { await self.collect(next) }
        let id = UUID(); pendingID = id; pending = task
        let value = await withTaskCancellationHandler { await task.value } onCancel: { task.cancel() }
        if pendingID == id { pending = nil }
        return value
    }

    private func request(_ path: String, connection: Connection, cookie: String? = nil, login: Bool = false) async throws -> HTTPResult {
        try Task.checkCancellation()
        var request = URLRequest(url: connection.endpoint.path(path))
        request.httpMethod = login ? "POST" : "GET"
        request.timeoutInterval = 3
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let cookie { request.setValue("omlx_admin_session=\(cookie)", forHTTPHeaderField: "Cookie") }
        if login {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: ["api_key": connection.apiKey, "remember": false])
        }
        let result = try await transport(request)
        try Task.checkCancellation()
        guard result.url == request.url, !(300..<400).contains(result.status) else { throw ConnectionError.unsafeResponse }
        if [401, 403].contains(result.status) { throw ConnectionError.unauthorized }
        guard result.status == 200 else { throw ConnectionError.unreachable }
        guard result.data.count <= 2_000_000 else { throw ConnectionError.oversized }
        return result
    }

    private func collect(_ connection: Connection) async -> RuntimeReading {
        guard !connection.apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return .unavailable(ConnectionError.credentialRequired.localizedDescription)
        }
        do {
            let now = clock()
            if now - verifiedAt >= 300 {
                let response = try await request("/health", connection: connection)
                let health = object(try JSONSerialization.jsonObject(with: response.data))
                guard health["status"] as? String == "healthy", nonnegative(object(health["engine_pool"])["model_count"]) != nil else {
                    throw ConnectionError.unsafeResponse
                }
                verifiedAt = clock()
            }
            if cookie == nil {
                let response = try await request("/admin/api/login", connection: connection, login: true)
                guard let value = response.sessionCookie, !value.isEmpty,
                      value.rangeOfCharacter(from: .newlines) == nil else { throw ConnectionError.unauthorized }
                cookie = value
            }
            guard let cookie else { throw ConnectionError.unauthorized }
            // Session totals are supplemental. A statistics failure does not hide live activity.
            let refreshStats = now - statsAt >= 10
            async let activity = request("/admin/api/activity", connection: connection, cookie: cookie)
            async let supplemental = optionalStats(connection, cookie: cookie, refresh: refreshStats)
            let (response, freshStats) = try await (activity, supplemental)
            var fresh = statsHealthy && stats != nil && now - statsAt < 15
            if refreshStats {
                statsAt = clock(); fresh = freshStats != nil; statsHealthy = fresh
                if let freshStats { stats = freshStats }
            }
            var result = try Normalizer.reading(activity: response.data, stats: stats)
            result.statsFresh = result.statsFresh && fresh
            let (id, currentProcessed) = Normalizer.continuity(response.data)
            if id != identity {
                identity = id; epoch += 1; processed = nil; changedAt = clock()
            }
            if currentProcessed != processed { processed = currentProcessed; changedAt = clock() }
            if result.phase == .prefill && clock() - changedAt >= 15 {
                result.rate = nil; result.message = "Prefill active. Waiting for fresh progress."
            }
            result.epoch = epoch
            return result
        } catch {
            cookie = nil; verifiedAt = -.infinity; epoch += 1
            // Never expose credentials, URLs from redirects, or raw server bodies in UI/errors.
            return .unavailable((error as? ConnectionError ?? .unreachable).localizedDescription)
        }
    }

    private func optionalStats(_ connection: Connection, cookie: String, refresh: Bool) async -> Data? {
        guard refresh else { return nil }
        return try? await request("/admin/api/stats?scope=session", connection: connection, cookie: cookie).data
    }
}
