import Foundation
import CryptoKit

// Public-key verification only. No private signing material is read or printed.
guard CommandLine.arguments.count == 4,
      let key = Data(base64Encoded: CommandLine.arguments[2]),
      let signature = Data(base64Encoded: CommandLine.arguments[3]) else {
    fputs("Usage: verify-update-signature.swift ARCHIVE PUBLIC_KEY SIGNATURE\n", stderr)
    exit(1)
}
do {
    let publicKey = try Curve25519.Signing.PublicKey(rawRepresentation: key)
    let bytes = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]), options: .mappedIfSafe)
    guard publicKey.isValidSignature(signature, for: bytes) else {
        fputs("The archive signature does not match the application's public key.\n", stderr)
        exit(1)
    }
    print("Archive signature matches the application's update key.")
} catch {
    fputs("Could not validate the update archive signature.\n", stderr)
    exit(1)
}
