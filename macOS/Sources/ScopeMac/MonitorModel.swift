import AppKit
import Foundation
import Observation
import ScopeCore

public enum MenuReadout: String, CaseIterable, Identifiable {
    case speed = "Token speed", memory = "Memory", cpu = "CPU", icon = "Icon only"
    public var id: String { rawValue }
    public var title: String { self == .speed ? "Activity · prefill + speed" : rawValue }
}

@MainActor @Observable
public final class MonitorModel {
    public var runtime = RuntimeReading()
    public var host = HostReading()
    public private(set) var speedHistory = History()
    public private(set) var cpuHistory = History()
    public private(set) var memoryHistory = History()
    public private(set) var paused = false
    public private(set) var busy = false
    public var efficient = false { didSet { defaults.set(efficient, forKey: "efficient"); restart() } }
    public var menuReadout: MenuReadout = .speed { didSet { defaults.set(menuReadout.rawValue, forKey: "menuReadout"); restart() } }
    public var progressDisplay: ProgressDisplay = .remaining { didSet { defaults.set(progressDisplay.rawValue, forKey: "progressDisplay") } }
    public var prefill: PrefillReading? { PrefillReading(runtime) }
    public private(set) var endpoint = "http://127.0.0.1:8000"
    public private(set) var credentialSource = "Not configured"
    public private(set) var settingsMessage: String?
    public private(set) var connectionBusy = false
    public private(set) var needsKeychainAccess = false
    public private(set) var samples: Int = 0
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let client: OmlxClient
    @ObservationIgnored private let credentials: any CredentialStore
    @ObservationIgnored private let sampler: @Sendable () async -> HostReading
    @ObservationIgnored private var key = ""
    @ObservationIgnored private var preferredModel: String?
    @ObservationIgnored private var loop: Task<Void, Never>?
    @ObservationIgnored private var generation = 0
    @ObservationIgnored private var visibleViews: Set<UUID> = []
    @ObservationIgnored private var asleep = false
    @ObservationIgnored private var screenAsleep = false
    @ObservationIgnored private var started = false
    @ObservationIgnored private var failures = 0
    @ObservationIgnored private var historySegment = 0
    @ObservationIgnored private var nextRuntimeAt: TimeInterval = 0
    @ObservationIgnored private var observers: [NSObjectProtocol] = []

    public convenience init(preview: Bool = false) {
        let transport = LocalTransport(), hostSampler = HostSampler()
        self.init(client: OmlxClient { try await transport.send($0) },
                  sampler: { await hostSampler.sample() },
                  defaults: preview ? UserDefaults(suiteName: "com.mikebuckets171.scope-preview")! : .standard,
                  loadSaved: !preview)
    }

    init(client: OmlxClient, sampler: @escaping @Sendable () async -> HostReading,
         defaults: UserDefaults, credentials: any CredentialStore = Credentials(),
         loadSaved: Bool = false, savedConnection: SavedConnection? = nil) {
        self.client = client; self.sampler = sampler; self.defaults = defaults; self.credentials = credentials
        guard loadSaved else { return }
        let preference = defaults.string(forKey: "credentialPreference")
        let saved = savedConnection ?? SavedConnection.discover(includeCredential: preference == nil || preference == "opencode")
        preferredModel = saved.model
        endpoint = defaults.string(forKey: "endpoint") ?? saved.endpoint ?? endpoint
        efficient = defaults.bool(forKey: "efficient")
        progressDisplay = ProgressDisplay(rawValue: defaults.string(forKey: "progressDisplay") ?? "") ?? .remaining
        menuReadout = MenuReadout(rawValue: defaults.string(forKey: "menuReadout") ?? "") ?? .speed
        // Startup never asks Security.framework to read, update, or delete a key.
        if preference == "keychain" {
            needsKeychainAccess = true; credentialSource = "Keychain · not opened"
            settingsMessage = "Choose Use Keychain Key to open your saved key, or use your OpenCode connection."
        } else if preference == "session" {
            credentialSource = "This launch only · key needed"
            settingsMessage = "The previous key was kept only in memory. Enter it again to connect."
        } else if preference != "none", saved.problem == nil, let savedKey = saved.key {
            key = savedKey; credentialSource = "OpenCode"
        }
        if let problem = saved.problem { settingsMessage = problem }
    }

    public var menuText: String {
        if paused { return "Paused" }
        switch menuReadout {
        case .icon: return ""
        case .cpu: return DisplayFormat.percent(host.cpu)
        case .memory: return DisplayFormat.percent(host.memoryPercent)
        case .speed:
            if let prefill { return prefill.menuText(progressDisplay) }
            if runtime.phase == .prefill { return "Prefill" }
            if runtime.connected, let rate = runtime.rate {
                let value = rate >= 1000 ? rate.formatted(.number.notation(.compactName).precision(.fractionLength(1))) : DisplayFormat.number(rate)
                return value + " t/s"
            }
            return runtime.phase == .idle ? "Ready" : runtime.phase == .offline ? "Offline" : "—"
        }
    }
    public var statusText: String { paused ? "Monitoring paused" : runtime.phase.title }
    public var isVisible: Bool { !visibleViews.isEmpty }
    public var sampleAge: String {
        guard samples > 0 else { return "Waiting for a sample" }
        return paused ? "Paused · values held" : "Updated " + host.sampledAt.formatted(date: .omitted, time: .standard)
    }
    public var hardware: String {
        "\(ProcessInfo.processInfo.activeProcessorCount) CPU cores · \(DisplayFormat.bytes(Double(ProcessInfo.processInfo.physicalMemory))) unified memory"
    }
    public func start() {
        guard !started else { return }; started = true
        let center = NSWorkspace.shared.notificationCenter
        for (notification, value, screen) in [
            (NSWorkspace.willSleepNotification, true, false), (NSWorkspace.didWakeNotification, false, false),
            (NSWorkspace.screensDidSleepNotification, true, true), (NSWorkspace.screensDidWakeNotification, false, true)
        ] {
            observers.append(center.addObserver(forName: notification, object: nil, queue: .main) { [weak self] _ in
                Task { @MainActor in
                    guard let self else { return }
                    self.historySegment += 1
                    if screen { self.screenAsleep = value } else { self.asleep = value }
                    self.restart()
                }
            })
        }
        restart()
    }
    public func stop() {
        started = false; generation += 1; loop?.cancel(); loop = nil
        observers.forEach { NSWorkspace.shared.notificationCenter.removeObserver($0) }; observers.removeAll()
    }
    public func setVisible(_ id: UUID, _ value: Bool) {
        let wasVisible = isVisible
        if value { visibleViews.insert(id) } else { visibleViews.remove(id) }
        if wasVisible != isVisible {
            if isVisible { nextRuntimeAt = 0 }
            restart()
        }
    }
    public func togglePause() { paused.toggle(); historySegment += 1; restart() }
    public func refresh() {
        guard started, !paused, !busy else { return }
        nextRuntimeAt = 0; restart()
    }
    private func restart() {
        generation += 1; let current = generation
        loop?.cancel(); loop = nil
        guard started, !paused, !asleep, !screenAsleep, isVisible || menuReadout != .icon else { return }
        loop = Task { [weak self] in
            while !Task.isCancelled {
                guard let self, current == self.generation else { return }
                await self.poll(current)
                guard current == self.generation, !Task.isCancelled else { return }
                do { try await Task.sleep(for: .seconds(self.samplingInterval)) } catch { return }
            }
        }
    }
    var samplingInterval: TimeInterval {
        let observingRuntime = isVisible || menuReadout == .speed
        return SamplingPolicy.interval(visible: isVisible, active: observingRuntime && runtime.hasActivity,
                                       lowPower: host.lowPower, efficient: efficient, failures: 0)
    }
    private func poll(_ current: Int) async {
        guard !busy else { return }; busy = true
        defer { busy = false }
        async let response = collectRuntime()
        let machine = await sampler()
        if current == generation, !Task.isCancelled {
            host = machine; samples += 1
            cpuHistory.append(time: machine.sampledAt, value: machine.cpu, segment: historySegment)
            memoryHistory.append(time: machine.sampledAt, value: machine.memoryPercent, segment: historySegment)
        }
        let responseValue = await response
        guard current == generation, !Task.isCancelled, let reading = responseValue else { return }
        runtime = reading
        failures = reading.connected ? 0 : min(5, failures + 1)
        nextRuntimeAt = reading.connected ? 0 : ProcessInfo.processInfo.systemUptime + min(30, pow(2, Double(failures)))
        speedHistory.append(time: reading.sampledAt, value: reading.rate, segment: reading.epoch &+ (historySegment &* 1_000_000))
    }

    private func collectRuntime() async -> RuntimeReading? {
        // A CPU/memory-only menu does not need runtime requests while all views are hidden.
        guard isVisible || menuReadout == .speed else { return nil }
        guard ProcessInfo.processInfo.systemUptime >= nextRuntimeAt else { return nil }
        guard let origin = try? Endpoint(endpoint) else { return .unavailable(ConnectionError.invalidEndpoint.localizedDescription) }
        return await client.snapshot(connection: Connection(endpoint: origin, apiKey: key, preferredModel: preferredModel))
    }

    @discardableResult
    public func saveConnection(endpoint text: String, newKey: String, rememberInKeychain: Bool = false) async -> Bool {
        guard !connectionBusy else { return false }
        connectionBusy = true; defer { connectionBusy = false }
        do {
            let parsed = try Endpoint(text)
            let entered = newKey.trimmingCharacters(in: .whitespacesAndNewlines)
            if !entered.isEmpty {
                if rememberInKeychain { try await credentials.save(entered) }
                key = entered; credentialSource = rememberInKeychain ? "Keychain" : "This launch only"
                defaults.set(rememberInKeychain ? "keychain" : "session", forKey: "credentialPreference")
                needsKeychainAccess = false
            }
            endpoint = parsed.url.absoluteString; defaults.set(endpoint, forKey: "endpoint")
            settingsMessage = entered.isEmpty ? "Connection saved. Your current key was kept."
                : rememberInKeychain ? "Key saved in Keychain. Opening it on a future launch is your choice."
                : "Key applied for this launch. It is not saved to disk."
            connectionChanged()
            return true
        } catch {
            settingsMessage = (error as? Credentials.Failure)?.localizedDescription
                ?? (error as? ConnectionError)?.localizedDescription ?? "Could not update the connection. Nothing was replaced."
            return false
        }
    }
    public func useExistingConnection() {
        guard !connectionBusy else { return }
        let saved = SavedConnection.discover()
        if let problem = saved.problem { settingsMessage = problem; return }
        guard let savedEndpoint = saved.endpoint, let origin = try? Endpoint(savedEndpoint) else {
            settingsMessage = "No supported oMLX connection was found. Enter your local endpoint."; return
        }
        // A server that explicitly permits key-free access can be monitored without a key.
        preferredModel = saved.model
        key = saved.key ?? ""; credentialSource = saved.key == nil ? "No API key" : "OpenCode"
        defaults.set("opencode", forKey: "credentialPreference")
        endpoint = origin.url.absoluteString; defaults.set(endpoint, forKey: "endpoint")
        needsKeychainAccess = false
        settingsMessage = "Using your saved local connection. No files or Keychain items were changed."
        connectionChanged()
    }
    public func useKeychainKey() async {
        guard !connectionBusy else { return }
        connectionBusy = true; defer { connectionBusy = false }
        do {
            guard let stored = try await credentials.read() else {
                settingsMessage = "No OMLX Scope key was found in Keychain. Your connection is unchanged."; return
            }
            key = stored; credentialSource = "Keychain"; needsKeychainAccess = false
            defaults.set("keychain", forKey: "credentialPreference")
            settingsMessage = "Using your Keychain key for this launch."
            connectionChanged()
        } catch { settingsMessage = (error as? Credentials.Failure)?.localizedDescription ?? "Could not open the saved key. Your connection is unchanged." }
    }
    public func forgetKey() async {
        guard !connectionBusy else { return }
        connectionBusy = true; defer { connectionBusy = false }
        do {
            try await credentials.remove()
            key = ""; credentialSource = "Not configured"; needsKeychainAccess = false
            defaults.set("none", forKey: "credentialPreference")
            settingsMessage = "Saved key removed from OMLX Scope. OpenCode files were not changed."
            connectionChanged()
        } catch { settingsMessage = (error as? Credentials.Failure)?.localizedDescription ?? "Could not remove the saved key. Your connection is unchanged." }
    }
    private func connectionChanged() {
        runtime = RuntimeReading(); speedHistory.clear(); failures = 0; nextRuntimeAt = 0; restart()
    }
    public func copyDiagnostics() {
        let text = "OMLX Scope \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "development")\n\(ProcessInfo.processInfo.operatingSystemVersionString)\nRuntime: \(runtime.phase.title)\nCredential source: \(credentialSource)\nHost samples: \(samples)\nPaused: \(paused)\nEnergy saving: \(efficient)\n"
        NSPasteboard.general.clearContents(); NSPasteboard.general.setString(text, forType: .string)
    }
    /// Preview fixtures are injected by a separate developer executable, never at app startup.
    public func setPreview(runtime: RuntimeReading, host: HostReading, rates: [Double?]) {
        self.runtime = runtime; self.host = host; samples = rates.count
        for (index, rate) in rates.enumerated() {
            let time = host.sampledAt.addingTimeInterval(Double(index - rates.count + 1))
            speedHistory.append(time: time, value: rate)
            cpuHistory.append(time: time, value: host.cpu)
            memoryHistory.append(time: time, value: host.memoryPercent)
        }
    }
}
