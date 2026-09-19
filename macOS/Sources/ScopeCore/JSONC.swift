import Foundation

/// OpenCode configuration: JSON with comments and trailing commas, not JSON5.
public enum JSONC {
    public static func object(_ data: Data) throws -> [String: Any] {
        var bytes = [UInt8](data)
        var quoted = false, escaped = false, index = 0
        while index < bytes.count {
            let value = bytes[index]
            if quoted {
                if escaped { escaped = false }
                else if value == 92 { escaped = true }
                else if value == 34 { quoted = false }
                index += 1; continue
            }
            if value == 34 { quoted = true; index += 1; continue }
            if value == 47, index + 1 < bytes.count {
                if bytes[index + 1] == 47 {
                    while index < bytes.count, bytes[index] != 10, bytes[index] != 13 {
                        bytes[index] = 32; index += 1
                    }
                    continue
                }
                if bytes[index + 1] == 42 {
                    bytes[index] = 32; bytes[index + 1] = 32; index += 2
                    var closed = false
                    while index < bytes.count {
                        if bytes[index] == 42, index + 1 < bytes.count, bytes[index + 1] == 47 {
                            bytes[index] = 32; bytes[index + 1] = 32; index += 2; closed = true; break
                        }
                        if bytes[index] != 10 && bytes[index] != 13 { bytes[index] = 32 }
                        index += 1
                    }
                    guard closed else { throw ConnectionError.malformed }
                    continue
                }
            }
            index += 1
        }
        guard !quoted else { throw ConnectionError.malformed }
        quoted = false; escaped = false
        var previous: UInt8?
        for position in bytes.indices {
            let value = bytes[position]
            if quoted {
                if escaped { escaped = false }
                else if value == 92 { escaped = true }
                else if value == 34 { quoted = false; previous = 34 }
                continue
            }
            if value == 34 { quoted = true; continue }
            if isSpace(value) { continue }
            if value == 44, let previous, ![UInt8(91), 123, 58, 44].contains(previous) {
                var next = position + 1
                while next < bytes.count && isSpace(bytes[next]) { next += 1 }
                if next < bytes.count && (bytes[next] == 93 || bytes[next] == 125) { bytes[position] = 32 }
            }
            previous = value
        }
        guard let result = try JSONSerialization.jsonObject(with: Data(bytes)) as? [String: Any] else {
            throw ConnectionError.malformed
        }
        return result
    }
    private static func isSpace(_ byte: UInt8) -> Bool { [9, 10, 13, 32].contains(byte) }
}
