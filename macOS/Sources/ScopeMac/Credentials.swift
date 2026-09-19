import Foundation
import Security

/// Called only from explicit Settings actions, never from startup or the sampler.
protocol CredentialStore: Sendable {
    func read() async throws -> String?
    func save(_ key: String) async throws
    func remove() async throws
}

/// Serializes potentially interactive Keychain work away from the main actor.
actor Credentials: CredentialStore {
    static let service = "com.mikebuckets171.omlx-scope"
    func read() throws -> String? {
        var query = base
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        try check(status)
        guard let data = item as? Data, let key = String(data: data, encoding: .utf8), !key.isEmpty else {
            throw Failure.storage
        }
        return key
    }
    func save(_ key: String) throws {
        let data = Data(key.utf8)
        let status = SecItemUpdate(base as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound {
            var query = base
            query[kSecValueData as String] = data
            // Use Keychain’s default protection; never broaden access controls.
            try check(SecItemAdd(query as CFDictionary, nil))
        } else { try check(status) }
    }
    func remove() throws {
        let status = SecItemDelete(base as CFDictionary)
        if status != errSecItemNotFound { try check(status) }
    }
    private var base: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: Self.service, kSecAttrAccount as String: "omlx"]
    }
    private func check(_ status: OSStatus) throws {
        if status == errSecUserCanceled { throw Failure.cancelled }
        guard status == errSecSuccess else { throw Failure.storage }
    }
    enum Failure: LocalizedError {
        case storage, cancelled
        var errorDescription: String? {
            switch self {
            case .storage: "Keychain could not complete this change. Your connection is unchanged."
            case .cancelled: "Keychain access was canceled. Your connection is unchanged."
            }
        }
    }
}
