# Changelog

## 0.4.1 — 2026-09-17

Hardening pass per the OMLX Scope Luna improvement prompt (truthful
telemetry, real configuration discovery, generation-aware polling, runnable
browser verification, and a deterministic installable artifact).

### Defects fixed
- Configuration discovery now supports JSON and JSONC `opencode.json(c)`,
  honours `XDG_DATA_HOME` for auth, accepts an absolute `OPENCODE_CONFIG`
  override, refuses non-absolute paths, and reports distinct
  `missing_`/`unreadable_`/`malformed_`/`invalid_endpoint` issues without
  silently switching endpoints after a malformed explicit configuration.
- Telemetry no longer turns unknown activity counts into `0` or structurally
  incomplete model records into `idle`; added regression cases for
  `{ engines: {}, active_models: { models: [{ id: 'qwen' }] } }` and the
  healthy empty-model response. A malformed but HTTP-200 stats response no
  longer takes down live activity.
- Removed unused `backendID` / `apiKeyRequired` / `scheduler` fields, the
  unused `/capabilities` endpoint, and the always-null request-total
  surface. Added a `sessionStatsState` (`fresh`/`stale`/`unavailable`)
  channel so the panel labels stale session aggregates honestly.
- The Poller is generation-aware: overlapping refresh requests cancel stale
  pending work, restart after pending completion, and stop reviving disposed
  UI. Service snapshots now use a coherent monotonic clock for TTLs and the
  bounded collection deadline.
- The session action no longer claims verified session-to-request
  correlation; the misleading session banner is removed and the panel
  shows runtime-wide telemetry.

### Subsystems rebuilt
- `service/config.ts` rewritten with `jsonc-parser@3.3.1`, layered merging,
  and granular issue types; `service/config.test.ts` covers JSONC,
  precedence, malformed input, credential changes, missing files, and
  unsafe URLs.
- `service/omlx-client.ts` runs activity, status, and stats reads in
  parallel under one bounded deadline, isolates stats failures, resets
  `identityAt` after auth/unreachable errors, and only caches healthy
  snapshots.
- `service/main.ts` now has structured async error handling and a single
  bounded shutdown path.
- `panel/main.ts` maps SDK host errors to actionable reasons via a new
  `panel/host-errors.ts`. JSON parse failures on the service response are
  isolated.
- Replaced the uninvoked `dev/verify-browser.js` with a pinned
  `@playwright/test@1.61.0` suite in `tests/browser/preview.ts`. CI now
  runs the full `bun run check`.

### Verified
- `bun run check` is green end-to-end:
  `tsc --noEmit` exit 0 · 34 unit/integration tests, 99 expectations,
  0 fail · built `panel/main.js` + `service/main.js` regenerated · 5/5
  Playwright Chromium checks (themes, viewports, focus/disclosure,
  refresh, runtime states, visibility pause/resume, page errors) · package
  verifier builds and inspects `dist/omlx-scope-openchamber-0.4.1.zip`
  (14 assets, ~118.7 KiB, no host config/OS code in panel bundle).
- No real OpenChamber desktop/oMLX end-to-end smoke test is available
  under the no-desktop-control constraint; the browser suite only covers
  the synthetic SDK host. This limitation is documented in the README.

### Compatibility and limitations
- OpenChamber `>= 1.24.0` (guest SDK `1.24.0`).
- Tested against oMLX `0.7.0.dev3` API shapes; other versions are not
  qualified.
- The companion RapidScope macOS app is built separately and remains an
  ad-hoc-signed local helper.

## 0.4.0 — 2026-09-17

- Added an OpenChamber session action that opens OMLX Scope with the selected
  session shown as context.
- Documented the SDK boundary: guest pages cannot mount inside the built-in
  Session inspector.

## 0.3.0 — 2026-09-17

- Rebranded the public plugin as **OMLX Scope**.
- Renamed the OpenChamber identity to `omlx-scope` and the isolated test
  overrides to `OMLX_SCOPE_*`.
- Moved the public repository to `omlx-scope-openchamber`.

## 0.2.0 — 2026-09-17

- Rebranded the extension as **oMLX Telemetry** for OpenChamber.
- Added a clean public-repository boundary, release metadata, privacy/security
  documentation, and CI.
- Refined the panel into a compact instrument surface without adding metrics.
- Renamed isolated test environment variables to `OMLX_TELEMETRY_*`.

## 0.1.0

- Initial read-only oMLX telemetry panel and host service.
