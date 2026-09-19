import Foundation
import CoreFoundation
import Darwin
import ScopeCore

struct SavedConnection {
    var endpoint: String?
    var key: String?
    var model: String?
    var problem: String?

    /// Same discovery order as the extension. Files and Keychain are never rewritten.
    static func discover(home: URL = FileManager.default.homeDirectoryForCurrentUser,
                         environment: [String: String] = ProcessInfo.processInfo.environment,
                         includeCredential: Bool = true) -> Self {
        func value(_ name: String) -> String? { nonempty(environment[name]) }
        func root(_ name: String, fallback: String) -> String {
            if let configured = value(name), configured.hasPrefix("/") { return configured }
            return home.appendingPathComponent(fallback).path
        }
        let configRoot = root("XDG_CONFIG_HOME", fallback: ".config")
        let dataRoot = root("XDG_DATA_HOME", fallback: ".local/share")
        var paths = [configRoot + "/opencode/opencode.json", configRoot + "/opencode/opencode.jsonc"]
        if let override = value("OPENCODE_CONFIG") {
            guard override.hasPrefix("/") else { return Self(problem: "OpenCode's configuration path must be absolute.") }
            paths.append(override)
        }
        var config: [String: Any] = [:]
        do {
            for path in paths { config = merge(config, try document(path)) }
        } catch { return Self(problem: "The saved OpenCode configuration could not be read. Check its format and file size.") }
        let options = ((config["provider"] as? [String: Any])?["omlx"] as? [String: Any])?["options"] as? [String: Any] ?? [:]
        var result = Self()
        if options.keys.contains("baseURL") {
            guard let text = options["baseURL"] as? String, let parsed = try? Endpoint(text) else {
                return Self(problem: "OpenCode's oMLX endpoint is not a supported local address.")
            }
            result.endpoint = parsed.url.absoluteString
        } else {
            do {
                let settings = try document(home.appendingPathComponent(".omlx/settings.json").path)
                if let server = settings["server"] as? [String: Any],
                   let port = server["port"] as? NSNumber, CFGetTypeID(port) != CFBooleanGetTypeID(),
                   port.doubleValue.rounded() == port.doubleValue, (1...65_535).contains(port.doubleValue) {
                    let address = "http://\(nonempty(server["host"] as? String) ?? "127.0.0.1"):\(port.intValue)"
                    guard let parsed = try? Endpoint(address) else {
                        return Self(problem: "The saved oMLX endpoint is not a supported local address.")
                    }
                    result.endpoint = parsed.url.absoluteString
                }
            } catch { return Self(problem: "The saved oMLX configuration could not be read. Check its format and file size.") }
        }
        if let model = nonempty(config["model"] as? String), model.hasPrefix("omlx/"), model.count > 5 {
            result.model = String(model.dropFirst(5))
        }
        if includeCredential {
            do {
                let auth = try document(dataRoot + "/opencode/auth.json")["omlx"] as? [String: Any] ?? [:]
                if auth["type"] as? String == "api" { result.key = nonempty(auth["key"] as? String) }
            } catch { result.problem = "OpenCode's saved oMLX key could not be read. Enter an API key to connect." }
        }
        return result
    }

    private static func nonempty(_ value: String?) -> String? {
        guard let text = value?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else { return nil }
        return text
    }
    private static func merge(_ base: [String: Any], _ overlay: [String: Any]) -> [String: Any] {
        var result = base
        for (key, value) in overlay where !["__proto__", "constructor", "prototype"].contains(key) {
            if let before = result[key] as? [String: Any], let after = value as? [String: Any] { result[key] = merge(before, after) }
            else { result[key] = value }
        }
        return result
    }
    private static func document(_ path: String) throws -> [String: Any] {
        // O_NONBLOCK rejects FIFOs without waiting for a writer; fstat checks the opened target.
        let descriptor = Darwin.open(path, O_RDONLY | O_NONBLOCK | O_CLOEXEC)
        if descriptor < 0 {
            if errno == ENOENT { return [:] }
            throw ConnectionError.malformed
        }
        let handle = FileHandle(fileDescriptor: descriptor, closeOnDealloc: true)
        defer { try? handle.close() }
        var info = stat()
        guard fstat(descriptor, &info) == 0, info.st_mode & S_IFMT == S_IFREG,
              info.st_size >= 0, info.st_size <= 1_000_000 else { throw ConnectionError.malformed }
        let count = Int(info.st_size)
        var data = Data(); data.reserveCapacity(count + 1)
        while data.count <= count {
            guard let chunk = try handle.read(upToCount: count + 1 - data.count), !chunk.isEmpty else { break }
            data.append(chunk)
        }
        guard data.count == count else { throw ConnectionError.malformed }
        return try JSONC.object(data)
    }
}
