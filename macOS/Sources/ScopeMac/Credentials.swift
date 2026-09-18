import Foundation
import Security

struct Credentials {
    static let service = "com.mikebuckets171.omlx-scope"
    static func read() -> String? {
        var query = base; query[kSecReturnData as String] = true; query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    static func save(_ key: String) throws {
        let status = SecItemUpdate(base as CFDictionary, [kSecValueData as String: Data(key.utf8)] as CFDictionary)
        if status == errSecItemNotFound {
            var query = base; query[kSecValueData as String] = Data(key.utf8)
            query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else { throw Failure.storage }
        } else if status != errSecSuccess { throw Failure.storage }
    }
    static func remove() throws {
        let status = SecItemDelete(base as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw Failure.storage }
    }
    private static var base: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: "omlx"]
    }
    enum Failure: LocalizedError {
        case storage
        var errorDescription: String? { "Keychain could not save this change. Your existing connection has not been replaced." }
    }
}

struct SavedConnection {
    var endpoint: String?
    var key: String?
    /// Only these two existing files are read, with size bounds; never rewritten.
    static func discover(home: URL = FileManager.default.homeDirectoryForCurrentUser) -> Self {
        func json(_ path: String) -> [String: Any] {
            let url = home.appendingPathComponent(path)
            guard let handle = try? FileHandle(forReadingFrom: url) else { return [:] }
            defer { try? handle.close() }
            guard let data = try? handle.read(upToCount: 1_000_001), data.count <= 1_000_000,
                  let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [:] }
            return value
        }
        let settings = json(".omlx/settings.json")
        let server = settings["server"] as? [String: Any] ?? [:]
        let auth = json(".local/share/opencode/auth.json")["omlx"] as? [String: Any] ?? [:]
        var result = Self()
        if let port = server["port"] as? Int, (1...65_535).contains(port) { result.endpoint = "http://127.0.0.1:\(port)" }
        if auth["type"] as? String == "api", let key = auth["key"] as? String, !key.isEmpty { result.key = key }
        return result
    }
}
