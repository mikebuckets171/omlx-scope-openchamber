# Release process

## Extension and preview releases

Update `package.json` and the matching section of `CHANGELOG.md` in a reviewed
pull request. Keep generated bundles synchronized. CI must pass on the exact
main commit: macOS/Linux checks, extracted-package startup, browser tests, native
builds, and bundle validation. The release workflow publishes only those tested
artifacts, verifies uploaded checksums, and uses an annotated version tag.

A native **preview** is ad-hoc signed with hardened runtime and has automatic
installation disabled. It may check public GitHub releases, but it cannot replace
its executable. Preview publication must stop when the signed update feed is
introduced. The publisher then follows the signed release path below.

## Publisher setup for signed Mac releases

These credentials must be created and retained by the repository owner. Never
paste them into issues, commits, pull requests, chat, or build logs.

1. Enroll in the Apple Developer Program and create a **Developer ID Application**
   signing identity on the release Mac. Keep its private key in Keychain.
2. Store notarization credentials using Apple’s `notarytool store-credentials` and
   retain the **profile name**, not a password, in the release environment.
3. Obtain the official Sparkle 2.10.0 tools. Verify the published archive SHA-256:
   `c2bf58aa8387266ac179357b1415d6f2635f044da8be41042af32425dae6da0c`.
   Run `generate_keys` once. Keep the private Ed25519 key in Keychain, retain a
   secure owner-managed backup, and record its public key for app builds.
4. Set `SIGN_IDENTITY`, `NOTARYTOOL_PROFILE`, `SPARKLE_PUBLIC_KEY`, and
   `SPARKLE_BIN` (the tools' `bin` directory). An alternate Keychain account can
   be selected with `SPARKLE_KEY_ACCOUNT`; the default is `ed25519`.

The Apple identity and Sparkle update key serve different purposes. An ad-hoc
signature cannot replace Developer ID; a SHA-256 checksum cannot replace a
trusted update signature. Do not rotate the update key without following
Sparkle's key-rotation guidance and testing the old-to-new transition.

## Produce a signed release

```sh
bash scripts/distribute-macos.sh
```

The script builds with Developer ID and hardened runtime, signs nested Sparkle
components inside-out, submits the app for notarization, staples the ticket,
validates the bundle, and requires platform assessment to succeed. It then
recreates the ZIP, signs the final archive, verifies that signature against the
app’s embedded public key, and creates/signs the appcast. Missing credentials or
failed checks stop the process; there is no preview fallback.

The output is the versioned native ZIP and `dist/appcast.xml`. **The script does
not publish anything.** Notarization metadata and private release files stay
outside the repository. Test the signed app on a clean Mac before publication.

## Publish signed updates

Publish the signed native ZIP on the matching GitHub release and verify the
uploaded bytes before publishing its feed. Never replace a published archive
with different bytes under an existing version. Create a new version instead.

The signed app is pinned to:

```text
https://raw.githubusercontent.com/mikebuckets171/omlx-scope-openchamber/updates/appcast.xml
```

Create the `updates` branch for the signed feed only when the first signed
release is ready. Commit the exact signed `appcast.xml` bytes at its root, after
the release asset is publicly available. Do not reformat the signed XML.
The presence of this branch disables automatic preview publication.

Test a real older signed installation upgrading to the newer release, including
cancel, relaunch, unavailable network, invalid signature, and unchanged Keychain
credentials. The ad-hoc previews do not establish this upgrade path; users must
install the first signed release manually. Never remove quarantine, disable
Gatekeeper, weaken library validation, or substitute a custom shell updater.

## References

- [Apple Developer ID](https://developer.apple.com/developer-id/)
- [Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
- [Sparkle publishing](https://sparkle-project.org/documentation/publishing/)
- [Sparkle security](https://sparkle-project.org/documentation/security/)
