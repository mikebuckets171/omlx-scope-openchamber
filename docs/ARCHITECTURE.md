# Architecture

## OpenChamber extension

`panel/main.ts` mounts the shell once. Monitoring updates existing text and chart
geometry rather than replacing interactive controls. `panel/` contains small
modules for progress, bounded histories, performance captures, sharing, and
preferences. `applyHostReady` applies the host’s current theme on every SDK ready
snapshot; semantic theme tokens distinguish accent fills from readable text.
The Share disclosure uses SDK buttons with view-local focus and keyboard handling.
It does not inspect or modify the parent application’s DOM.

`ReplyCapture` is an explicitly armed state machine. The supported session
subscription selects an interval; existing runtime snapshots supply the readings.
It ignores cached pre-start samples and stops on session changes, monitoring
interruptions, or its time limit. All subscriptions end when the view closes.
This mode is sidebar-only: selecting a chat closes OpenChamber’s full-page
extension. No extra polling loop, timer, message history, or disk log is added.

The host-managed Node service exposes authenticated health and snapshot routes.
`service/omlx-client.ts` shares in-flight collection and caches supplemental
readings. Connections are restricted to canonical numeric loopback HTTP origins;
redirects, body sizes, and time are bounded. Credentials stay service-side.
`src/telemetry.ts` normalizes server responses into a scalar display contract.

CPU and memory use Node’s public system information. Additional macOS VM/swap
readings use two fixed, read-only commands with cached results, an independent
deadline, and bounded output. No persistent child process is introduced.

The panel bundle is built by the pinned SDK guest bundler. The service uses stock
`bun build --target=node --format=esm`. The explicit JSONC ESM import and an
extracted-package test under Node without `node_modules` guard against packaging
regressions. Generated bundles are checked in because installation does not
compile TypeScript. The release allowlist, local links in packaged Markdown,
and 224 KiB budget are checked in CI.

## Native Mac companion

`macOS/` is a Swift package targeting macOS 14. `ScopeCore` contains portable
measurement and release-catalog logic. `ScopeMac` owns platform sampling,
connection storage, observation state, views, and update handling. `OMLXScope`
defines application scenes. `ScopePreview` is a developer-only renderer and is
not included in the application bundle.

Native views share one sampler. Public Mach, sysctl, ProcessInfo, and
IOPowerSources APIs supply host readings. New API keys use Keychain; non-secret
preferences use UserDefaults. The app and extension do not share a hidden IPC
bridge and never modify each other.

Update traffic has a separate ephemeral HTTPS session. Preview builds do not link
or embed an installer framework. They discover stable, native GitHub releases
but do not install executable updates. Configured Developer ID builds use pinned
Sparkle 2.10.0 with archive and non-expiring feed-signature validation,
verification before extraction, explicit user preferences, and no system-profile
reporting. Sparkle’s short-lived installation components are part of its standard
framework; there is no project-specific updater daemon.

## Boundaries

Runtime measurements are server-wide. Chat metadata enables explicit draft
sharing and chooses the next-reply capture interval; it never proves request
ownership or successful completion. OpenChamber 1.24.2 does not expose Turn Stats
measurements or an extension hook for that view. Histories and performance
captures remain in memory and do not contain prompts or completions.
Missing or inconsistent values remain unavailable. No code controls inference,
changes runtime settings, disables platform security, or polls private sensors.

## Verification

CI runs TypeScript tests/builds, extracted-package smoke checks, Chromium/WebKit
interaction tests, native Swift tests, bundle validation, and native fixture
rendering. Test fixtures do not establish live runtime compatibility. Developer
ID signing, notarization, and signed update installation require the owner’s
release credentials and a separate end-to-end release validation.
