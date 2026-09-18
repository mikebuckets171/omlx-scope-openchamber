import AppKit
import Foundation
import Observation
import Security
#if SCOPE_SIGNED_UPDATES
import Sparkle
#endif
import ScopeCore

/// Sparkle is enabled only in configured Developer ID builds. Ad-hoc previews can
/// discover releases, but never replace executable code or weaken Gatekeeper.
@MainActor @Observable
public final class UpdateController {
    public enum State: Equatable {
        case idle, checking, current, available(MacRelease), failed(String)
    }
    public private(set) var state: State = .idle
    public private(set) var canCheck = true
    public private(set) var lastChecked: Date?
    public let installedVersion: ReleaseVersion?
    public private(set) var secureInstallation = false
    public var automaticallyChecks: Bool {
        get {
            _ = updatePreferencesRevision
            #if SCOPE_SIGNED_UPDATES
            if let controller { return controller.updater.automaticallyChecksForUpdates }
            #endif
            return previewAutomaticChecks
        }
        set {
            #if SCOPE_SIGNED_UPDATES
            if let controller { controller.updater.automaticallyChecksForUpdates = newValue; return }
            #endif
            previewAutomaticChecks = newValue
            defaults.set(newValue, forKey: "updates.checkAutomatically")
            scheduleChecks()
        }
    }
    public var automaticallyInstalls: Bool {
        get {
            _ = updatePreferencesRevision
            #if SCOPE_SIGNED_UPDATES
            return secureInstallation && (controller?.updater.automaticallyDownloadsUpdates ?? false)
            #else
            return false
            #endif
        }
        set {
            #if SCOPE_SIGNED_UPDATES
            if secureInstallation { controller?.updater.automaticallyDownloadsUpdates = newValue }
            #endif
        }
    }
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let fetch: @Sendable () async throws -> MacRelease
    #if SCOPE_SIGNED_UPDATES
    @ObservationIgnored private var controller: SPUStandardUpdaterController?
    @ObservationIgnored private var canCheckObservation: NSKeyValueObservation?
    @ObservationIgnored private var preferenceObservations: [NSKeyValueObservation] = []
    #endif
    @ObservationIgnored private var task: Task<Void, Never>?
    @ObservationIgnored private var schedule: Task<Void, Never>?
    @ObservationIgnored private var started = false
    @ObservationIgnored private var lastAttempt: Date?
    private var previewAutomaticChecks = false
    private var updatePreferencesRevision = 0

    public init() {
        let transport = ReleaseTransport()
        defaults = .standard
        fetch = { try await transport.latest() }
        installedVersion = (Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String).flatMap(ReleaseVersion.init)
        lastChecked = defaults.object(forKey: "updates.lastChecked") as? Date
        lastAttempt = defaults.object(forKey: "updates.lastAttempt") as? Date
        previewAutomaticChecks = defaults.bool(forKey: "updates.checkAutomatically")
        #if SCOPE_SIGNED_UPDATES
        if Self.isSignedUpdateBuild(Bundle.main) {
            let controller = SPUStandardUpdaterController(startingUpdater: false, updaterDelegate: nil, userDriverDelegate: nil)
            self.controller = controller
            secureInstallation = true
            canCheckObservation = controller.updater.observe(\.canCheckForUpdates, options: [.initial, .new]) { [weak self] _, change in
                let value = change.newValue ?? false
                Task { @MainActor [weak self] in self?.canCheck = value }
            }
            preferenceObservations = [
                controller.updater.observe(\.automaticallyChecksForUpdates, options: [.new]) { [weak self] _, _ in
                    Task { @MainActor [weak self] in self?.updatePreferencesRevision += 1 }
                },
                controller.updater.observe(\.automaticallyDownloadsUpdates, options: [.new]) { [weak self] _, _ in
                    Task { @MainActor [weak self] in self?.updatePreferencesRevision += 1 }
                }
            ]
        }
        #endif
    }

    init(version: String, defaults: UserDefaults, fetch: @escaping @Sendable () async throws -> MacRelease) {
        installedVersion = ReleaseVersion(version)
        self.defaults = defaults; self.fetch = fetch
    }

    public var versionLabel: String { installedVersion?.description ?? "Development build" }
    public var status: String {
        _ = updatePreferencesRevision
        switch state {
        case .idle: return "Check for new Mac releases on GitHub."
        case .checking: return "Checking GitHub…"
        case .current: return "You’re up to date."
        case .available(let release): return "OMLX Scope \(release.version) is available."
        case .failed(let message): return message
        }
    }

    public func start() {
        guard !started else { return }; started = true
        #if SCOPE_SIGNED_UPDATES
        if let controller {
            controller.updater.clearFeedURLFromUserDefaults()
            controller.startUpdater()
            return
        }
        #endif
        scheduleChecks()
    }

    public func stop() {
        schedule?.cancel(); schedule = nil
        task?.cancel(); task = nil
        started = false
    }

    public func check() {
        start()
        guard canCheck else { return }
        #if SCOPE_SIGNED_UPDATES
        if let controller { controller.checkForUpdates(nil); return }
        #endif
        guard task == nil else { return }
        guard installedVersion != nil else { state = .failed(ReleaseError.developmentBuild.localizedDescription); return }
        state = .checking; canCheck = false
        lastAttempt = Date(); defaults.set(lastAttempt, forKey: "updates.lastAttempt")
        task = Task { [weak self] in
            guard let self else { return }
            defer { self.task = nil; self.canCheck = true }
            do {
                let release = try await self.fetch()
                guard !Task.isCancelled else { return }
                self.state = release.version > self.installedVersion! ? .available(release) : .current
                self.lastChecked = Date()
                self.defaults.set(self.lastChecked, forKey: "updates.lastChecked")
            } catch {
                if !Task.isCancelled { self.state = .failed((error as? ReleaseError ?? .unreachable).localizedDescription) }
            }
        }
    }

    public func openRelease() {
        let url: URL
        if case .available(let release) = state { url = release.pageURL }
        else { url = ReleaseCatalog.releasesURL }
        NSWorkspace.shared.open(url)
    }

    private func scheduleChecks() {
        schedule?.cancel(); schedule = nil
        guard started, previewAutomaticChecks, !secureInstallation else { return }
        schedule = Task { [weak self] in
            while !Task.isCancelled {
                guard let self else { return }
                let age = self.lastAttempt.map { Date().timeIntervalSince($0) } ?? 86_400
                if age >= 86_400 || age < 0 { self.check() }
                let delay = max(60, 86_400 - (self.lastAttempt.map { Date().timeIntervalSince($0) } ?? 0))
                do { try await Task.sleep(for: .seconds(min(86_400, delay))) } catch { return }
            }
        }
    }

    static func isSignedUpdateBuild(_ bundle: Bundle) -> Bool {
        #if SCOPE_SIGNED_UPDATES
        guard bundle.bundleIdentifier == "com.mikebuckets171.omlx-scope",
              bundle.object(forInfoDictionaryKey: "SUFeedURL") as? String == ReleaseCatalog.feedURL.absoluteString,
              let encoded = bundle.object(forInfoDictionaryKey: "SUPublicEDKey") as? String,
              Data(base64Encoded: encoded)?.count == 32,
              bundle.object(forInfoDictionaryKey: "SURequireSignedFeed") as? Bool == true,
              bundle.object(forInfoDictionaryKey: "SUVerifyUpdateBeforeExtraction") as? Bool == true,
              bundle.object(forInfoDictionaryKey: "SUSignedFeedFailureExpirationInterval") as? Int == 0 else { return false }
        var code: SecStaticCode?
        guard SecStaticCodeCreateWithPath(bundle.bundleURL as CFURL, [], &code) == errSecSuccess,
              let code else { return false }
        var requirement: SecRequirement?
        let rule = #"anchor apple generic and certificate leaf[field.1.2.840.113635.100.6.1.13] exists"#
        guard SecRequirementCreateWithString(rule as CFString, [], &requirement) == errSecSuccess else { return false }
        return SecStaticCodeCheckValidity(code, SecCSFlags(rawValue: kSecCSStrictValidate), requirement) == errSecSuccess
        #else
        return false
        #endif
    }
}
