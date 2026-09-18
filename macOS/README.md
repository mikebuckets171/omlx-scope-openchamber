# OMLX Scope for Mac

A native monitoring window and menu-bar companion for oMLX. Built with SwiftUI,
Foundation, and public macOS resource APIs. No third-party Swift packages,
embedded web app, bundled Node runtime, helper daemon, or login item.

## Install

Requires an **Apple Silicon Mac with macOS 14 or newer**. Download
`OMLX-Scope-macOS-0.5.2.zip` from Releases, unzip it, and move
**OMLX Scope.app** to Applications. Closing the monitor leaves the menu-bar item
running; choose **Quit OMLX Scope** from its menu to quit the application.

This native companion is an **ad-hoc-signed preview**. It is not Developer ID
signed or notarized, and macOS may block first launch. Use Apple’s normal
Privacy & Security review process only after reviewing and trusting the source,
or build locally. Do not disable Gatekeeper. The extension has its own ZIP
and does not install the native app automatically.

## Connection

Open Settings from the toolbar or popover. Only numeric loopback endpoints such
as `http://127.0.0.1:8000` are accepted. A trailing `/v1` is normalized to the
server origin. Health must identify as oMLX before login.

New keys are stored in Keychain. Leave the key field blank to keep the current
key. **Use Saved Connection** reads the port from `~/.omlx/settings.json` and
the oMLX API credential from `~/.local/share/opencode/auth.json`; neither file
is changed. The native app does not merge OpenCode JSONC/project configuration
or custom XDG paths. Use an explicit endpoint and key for those setups.

## Menu bar and energy use

Choose token speed, CPU, memory occupancy, or icon only. Token speed is the
current request’s reported average, not an instantaneous estimate. Concurrent
requests are not combined into a misleading per-request speed.

All native views share one sampler. Active visible views update at most once
per second; idle views use three seconds. Background readouts use five seconds,
or ten with energy saving / Low Power Mode. Visible energy-saving updates use
three seconds. Connection failures back off to at most one attempt every 30
seconds. Session totals refresh at most once every ten seconds; power-source
metadata is cached for 30 seconds. Icon-only mode stops hidden sampling.
Sleep, display sleep, and manual pause stop updates. Already pending requests
may take a bounded time to cancel. History is limited to 90 seconds and 180
points per trace. There is no decorative continuous animation.

The native app and extension are independent clients. Running both can produce
two sets of requests. There is no undocumented inter-app bridge or shared
credential endpoint; each application shares only its own collection work.

## Readings

CPU uses differences in public Mach counters. Non-free RAM is physical memory
minus free pages, including reclaimable pages; it is not Activity Monitor’s
Memory Used or memory pressure. Compression is physical compressor storage.
Allocated swap does not show swap traffic. Thermal state is a system-reported
category, not a temperature. No private GPU, fan, temperature, or bandwidth
sensors are queried. Missing values remain unavailable.

The oMLX client reads health, login, activity, and session-statistics endpoints.
Dashboard endpoint shapes remain version-dependent. It does not send prompts,
control inference, change models, or edit runtime configuration. Redirects are
rejected; response bytes and timeouts are bounded.

## Build and verify

```sh
swift test --package-path macOS
bash scripts/package-macos.sh
./script/build_and_run.sh --verify
```

Packaging produces `dist/OMLX Scope.app` and a versioned ZIP. It verifies bundle
structure, local code signature, and system-library linkage. The executable has
an 8 MB budget; the separate extension keeps its 160 KiB uncompressed budget.

CI tests native models, host APIs, and bounded loopback transport, renders native
SwiftUI fixtures, and launches the app. Previews use synthetic data. Live oMLX
sessions, Keychain prompts, VoiceOver, menu interaction, battery impact, and
inference-throughput impact need additional end-user Mac validation. Idle CI
process observations are not an energy-efficiency guarantee.

## Platform references

- [MenuBarExtra](https://developer.apple.com/documentation/swiftui/menubarextra)
- [Host statistics](https://developer.apple.com/documentation/kernel/1502546-host_statistics)
- [Thermal state](https://developer.apple.com/documentation/foundation/processinfo/thermalstate-swift.property)
- [Power sources](https://developer.apple.com/documentation/iokit/iopowersources_h)
- [OpenChamber SDK](https://docs.openchamber.dev/sdk/)
