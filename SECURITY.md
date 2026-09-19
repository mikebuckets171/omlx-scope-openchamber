# Security

## Reporting

Use this repository’s private **Security → Report a vulnerability** option when
available. Otherwise open an issue asking for a private reporting channel without
publishing the vulnerability details. Do not include credentials, auth files,
session cookies, private conversations, or raw server responses in public issues.

Include the affected version, minimal reproduction, required access, and impact
in the private report. Only the latest published version receives fixes.

## Security boundaries

The Mac app does not call Keychain at startup or while sampling. Manual keys are
memory-only unless the user selects secure storage. Optional Keychain actions may
show macOS authorization; canceling does not replace the active connection. No
access-control list is broadened and no plaintext credential fallback is added.

The extension panel is sandboxed by OpenChamber. Its approved local service is
not: it runs under the same user account as OpenChamber and can read the saved
oMLX credential. The listed commands describe intended use, not an OS-level
sandbox or a guarantee that third-party code cannot access other local files.
Review the source and install only releases you trust.

- Runtime monitoring is loopback-only, bounded, and read-only. Dashboard reads
  use the local oMLX login; health identification happens before credentials are sent.
  Redirects are rejected before credentials can be forwarded.
- Configuration discovery reads documented local paths; the manifest requests
  only the two fixed macOS diagnostic commands. The service requires a host-provided token on every route.
- Sharing is an explicit user action and cannot send a chat message. Display and
  report contracts exclude credentials and raw request content.
- Mac update discovery uses an independent HTTPS session and validates the
  repository, stable version, and exact native asset URL. Preview builds do not
  extract or install downloads.

## Mac distribution

Current downloadable Mac builds are **ad-hoc signed and not notarized**. A local
integrity signature is not an Apple-verified publisher identity or a malware
review. macOS may block launch. Do not disable Gatekeeper, remove quarantine
attributes, or weaken signature verification to make an installer work.

The production path requires a Developer ID Application identity, hardened
runtime, notarization, stapling, and successful platform assessment. Signed
updates additionally require an Ed25519 public key in the app and signed update
archives and feeds. Sparkle is pinned and its binary checksum is verified by
SwiftPM. Automatic installation is compiled out of preview builds. Feed-signature
failures do not expire in the signed build policy.

See [Release process](https://github.com/mikebuckets171/omlx-scope-openchamber/blob/main/docs/RELEASING.md). Signing/notarization reduce distribution
risk; they do not prove the absence of vulnerabilities. Automated fixture tests
are not a substitute for an independent security audit or live release testing.
