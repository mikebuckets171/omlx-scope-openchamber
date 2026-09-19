# Changelog

## 0.5.8 — 2026-09-19

- Check monitoring contracts against oMLX 0.6.4 and OpenChamber 1.24.2; update the pinned SDK.
- Remove automatic Keychain access at Mac app startup. Keep manually entered keys in memory unless secure storage is explicitly selected.
- Add explicit Keychain actions with cancellation handling, without changing existing saved-key access controls.
- Bring Mac connection discovery in line with the extension's supported OpenCode JSON/JSONC and absolute configuration paths.
- Show validated model-context headroom and request-matched input reuse in the Mac overview and menu popover.
- Align prefill-stage changes, concurrent and non-streaming activity, and malformed-data handling across both clients.
- Support servers that already allow key-free monitoring, without changing their authentication policy.
- Run shared reading and configuration fixtures against both implementations; document supported and intentionally separate features.

Mac builds remain ad-hoc-signed previews, not notarized. This update removes
Scope's background Keychain access, not Finder or Gatekeeper security decisions.

## 0.5.7 — 2026-09-19

- Point at the speed chart to inspect earlier readings, or use the arrow keys.
- Check the extension connection from the monitor and open the setup guide.
- Keep previous readings clearly marked while a hidden or restored panel reconnects.
- Refine spacing, chart proportions, labels, and narrow-panel readability.
- Limit configuration-file reads and validate local server addresses.
- Clarify installation, platform support, permissions, and contribution guidance.

Mac signing status is unchanged: the companion is a preview with manual installation.

## 0.5.6 — 2026-09-18

- Follow OpenChamber’s active theme, including accent colors and live theme changes.
- Move copying and chat-draft sharing into a compact, keyboard-accessible Share menu.
- Keep feedback out of the monitor layout and preserve prefill, captures, and compact mode.
- Add native Check for Updates and opt-in daily GitHub release checks.
- Integrate pinned Sparkle for configured Developer ID builds; previews remain manual-install.
- Add hardened-runtime packaging and a fail-closed notarization/signed-feed release path.
- Refresh installation, architecture, privacy, contribution, and release documentation.

The native preview is not notarized. Automatic installation requires publisher
signing credentials and is not enabled in this release.

## 0.5.5 — 2026-09-18

- Added host-provided OpenChamber context and a stats-to-draft action that never sends automatically.
- Added 30/60-second performance captures, a pinned comparison, and measurement-only exports.
- Added model-context headroom, explicitly separate from OpenCode compaction and output limits.
- Prioritized prefill progress in the extension's visual hierarchy.
- Updated the Mac menu bar to show prefill percentage before generation speed, with a remaining/completed preference.
- Added detailed native prefill progress and stage estimates to the popover and monitoring window.
- Reduced hidden CPU/memory-only monitoring work and added independent deadlines to native resource commands.


## 0.5.4 — 2026-09-18

- Added a runtime-reported prefill stage time estimate beside percentage remaining.
- Added recent generation speed based on observed output-token changes.
- Added memory-only recent generation observations, with copy and clear controls.
- Added a cache/input breakdown and concurrent model activity roster.
- Kept compact view, saved preferences, read-only access, and the service-startup fix.
- No dependency or permission changes. The optional Mac companion is unchanged.

## 0.5.3 — 2026-09-18

- Restored a prominent prefill percentage remaining, with processed/total counts.
- Added compact view, saved energy-saving preferences, and privacy-conscious Copy stats.
- Made stale, invalid, paused, and multi-stage prefill progress explicit.
- Kept energy-saving throughput history connected at its actual sampling cadence.
- Reduced the packaged service's whitespace without changing dependencies or permissions.

This is an OpenChamber extension update. The native Mac companion remains at 0.5.2.

## 0.5.2 — 2026-09-17

- Added an optional native Mac companion with a monitoring window and menu-bar popover.
- Added selectable menu-bar readings, energy-saving updates, and sleep-aware sampling.
- Added native CPU, memory, battery, and thermal-state readings using public macOS APIs.
- Added Keychain-backed connection settings and sanitized diagnostics.
- Added an energy-saving control to the OpenChamber extension.
- Preserved the 0.5.1 packaged-service startup fix.

The native companion is an ad-hoc-signed preview, not a notarized application.

## 0.5.1 — 2026-09-17

- Fixed a service startup failure that left the monitor waiting for oMLX.
- Added clear startup error details and packaged-service regression checks.
- No changes to the panel or Mac resource monitoring features.

## 0.5.0 — 2026-09-17

- Added a full-page monitor alongside the compact OpenChamber panel.
- Added bounded CPU and memory history, Mac wired/compressed memory, and swap readings.
- Kept host readings available during oMLX connection failures.
- Added pause/resume and stale-response handling without changing model execution.
- Improved retry scheduling and retained separate freshness states for session totals.
- Corrected environment-dependent configuration tests and strengthened package checks.
- Expanded macOS and cross-browser verification.
- Refreshed the installation guide and metric reference.

## 0.4.1 — 2026-09-17

- Added JSONC configuration support and clearer connection diagnostics.
- Improved handling of incomplete activity and stale session statistics.
- Added request deadlines, loopback integration tests, and browser checks.
- Clarified that monitoring covers the runtime rather than an individual chat.

## 0.4.0 — 2026-09-17

- Added an OpenChamber session-menu shortcut to the monitor.

## 0.3.0 — 2026-09-17

- Updated package identity and installation settings.

## 0.2.0 — 2026-09-17

- Added public distribution, licensing, privacy documentation, and CI.
- Refined the compact monitoring panel.

## 0.1.0

- Initial read-only oMLX monitor and local service.
