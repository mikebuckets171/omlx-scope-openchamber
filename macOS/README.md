# OMLX Scope for Mac

A native monitoring window and menu-bar companion for oMLX. Requires an Apple
Silicon Mac with macOS 14 or newer. The OpenChamber extension installs separately.

## Install and connect

Download the versioned `OMLX-Scope-macOS-*.zip` from Releases. Quit the previous
app, unzip the download, and replace **OMLX Scope.app** in Applications.
The current build is an **ad-hoc-signed preview, not notarized**; macOS may block
first launch. Review the source or build locally. Do not disable Gatekeeper.

Open Settings and enter your local endpoint, such as `http://127.0.0.1:8000`.
A trailing `/v1` is normalized. **Use OpenCode Connection** reads the saved oMLX
provider URL from OpenCode JSON/JSONC, falling back to oMLX's saved port only when
no provider URL is configured. Absolute XDG paths and `OPENCODE_CONFIG` are
supported; malformed explicit configuration does not silently fall back.
The oMLX API credential is read from OpenCode's auth file, not other providers.
No configuration file is changed.

A **new manually entered API key is kept only until you quit** by default.
Choose **Save new key in Keychain** to persist it securely. Leave the field blank
to keep the key already in use. Scope never writes keys to UserDefaults or a new
plaintext file. A server that already allows key-free monitoring can be read
without a key; Scope does not disable or change the server's authentication.

### Password prompts

**Startup and monitoring do not open Keychain.** An older saved Scope key remains
in Keychain untouched. Choose **Use Keychain Key…** to open it for this launch;
macOS may request authorization. Saving or explicitly forgetting a Keychain key
may also need authorization. Canceling leaves the current connection unchanged.
The existing OpenCode connection does not require creating another Keychain item.

A password dialog while **copying or replacing** the app can instead come from
Finder's permission to write the destination. For a per-user installation, use
`~/Applications` rather than a protected system-wide destination. This does not
bypass Gatekeeper or make a preview notarized. A prompt during first launch or
**Open Anyway** is a separate publisher-trust decision. Check the dialog's app
name and wording; do not enter a Mac login password into Scope's API-key field.

The app does not request administrator access, install a privileged helper, or
need Full Disk Access to monitor ordinary host resources. Finder, Keychain and
Gatekeeper can still enforce their own policies. See Apple's
[Keychain prompt guide](https://support.apple.com/guide/keychain-access/if-youre-asked-for-access-to-your-keychain-kyca1243/mac).

## Menu bar

**Activity · prefill + speed** shows prefill remaining/completed percentage and
switches to token speed during generation. The percentage preference is in
Settings. The popover and monitor show stage counters and a valid reported time
estimate. The popover and overview also show validated model-context headroom and
input reuse. These are model readings, not OpenCode compaction limits. CPU, memory occupancy, and icon-only modes are also available.

Closing the window leaves the menu-bar app running. Choose **Quit OMLX Scope**
to exit. Monitoring pause does not pause your model.

## Updates

**Check for Updates…** is available in the application menu, menu-bar popover,
and Settings. It finds stable native releases on GitHub, ignoring extension-only
releases. Enable automatic checks for a daily check while the app is running.

In preview builds, a new release opens on GitHub for manual installation.
Executable replacement is deliberately unavailable. Configured Developer ID
builds use Sparkle for signed update installation. Publisher signing keys and
Apple notarization credentials are required before that path can be released.
See [the release guide](../docs/RELEASING.md); this preview does not remove macOS
publisher warnings or claim a tested automatic upgrade from older versions.

## Resource use

SwiftUI views share a collector; there is no embedded browser or Node runtime.
Visible activity samples at most once per second. Hidden Activity mode uses two
seconds while active and five while idle; energy-saving mode reduces cadence.
Hidden CPU/memory-only modes skip oMLX requests. Hidden icon-only, sleep, and
manual pause stop sampling. Supplemental totals refresh less frequently; model
context limits refresh at most once a minute and are optional.
Histories are bounded to 90 seconds/180 points. Update checks have their own
bounded, opt-in daily schedule and do not carry oMLX credentials.

The app and extension are independent clients, so using both duplicates some
monitoring requests. Public Mach/sysctl/ProcessInfo/IOPowerSources APIs supply
CPU, memory, swap, thermal state, and battery information. No private GPU, fan,
or temperature sensors are queried. Metric definitions are in the interface and
[reference](../docs/METRICS.md).

## Build

```sh
swift test --package-path macOS
bash scripts/package-macos.sh
./script/build_and_run.sh --verify
```

Preview builds have no third-party Swift dependency or installer framework.
Developer ID builds pin Sparkle 2.10.0, embed its framework and full license, and
sign nested code inside-out. Both modes validate bundle integrity, hardened
runtime, and dynamic-library paths. CI compiles and tests both configurations.
`ScopePreview` is a separate developer executable, not part of the shipped app.

CI builds, tests, launches, and renders fixtures on macOS ARM64. Live oMLX use,
Keychain prompts, complete menu interaction, VoiceOver, battery/inference impact,
and signed end-to-end updates require separate validation.
