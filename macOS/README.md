# OMLX Scope for Mac

A native monitoring window and menu-bar companion for oMLX. Requires an Apple
Silicon Mac with macOS 14 or newer. The OpenChamber extension installs separately.

## Install and connect

Download the versioned `OMLX-Scope-macOS-*.zip` from Releases. Quit the previous
app, unzip the download, and replace **OMLX Scope.app** in Applications.
The current build is an **ad-hoc-signed preview, not notarized**; macOS may block
first launch. Review the source or build locally. Do not disable Gatekeeper.

Open Settings and enter your canonical local endpoint, such as
`http://127.0.0.1:8000`. A trailing `/v1` is normalized. New API keys are stored in
Keychain. Leave the key blank to retain it. **Use Saved Connection** reads the
port from `~/.omlx/settings.json` and oMLX credential from
`~/.local/share/opencode/auth.json`, without modifying either file. Custom XDG or
project JSONC locations require an explicit endpoint and key in this app.

## Menu bar

**Activity · prefill + speed** shows prefill remaining/completed percentage and
switches to token speed during generation. The percentage preference is in
Settings. The popover and monitor show stage counters and a valid reported time
estimate. CPU, memory occupancy, and icon-only modes are also available.

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
manual pause stop sampling. Supplemental totals refresh less frequently.
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

The package pins Sparkle 2.10.0. Packaging embeds its framework and full license,
signs nested code inside-out, and validates the bundle and dynamic-library paths.
`ScopePreview` is a separate developer executable, not part of the shipped app.

CI builds, tests, launches, and renders fixtures on macOS ARM64. Live oMLX use,
Keychain prompts, complete menu interaction, VoiceOver, battery/inference impact,
and signed end-to-end updates require separate validation.
