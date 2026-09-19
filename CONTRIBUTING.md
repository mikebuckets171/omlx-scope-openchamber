# Contributing

## Development

```bash
bun install --frozen-lockfile
bun run check
bunx playwright install chromium webkit
bun run test:browser
```

`bun run check` runs TypeScript, unit/integration tests, the production build,
and installable-package verification. `bun run test:browser` starts the preview
server and tests the built panel. `bun run check:all` runs both. On Linux,
the real macOS command test is skipped; CI runs it on a macOS runner.

`bun run preview` opens a local synthetic test harness, not a connection to
your oMLX server. Screenshots and traces are written to ignored test directories.

## Pull requests

Keep changes focused. Explain observable behavior, include regression tests,
and preserve the documented SDK and read-only boundaries. Do not add private
APIs, a second monitoring service, or dependencies without a demonstrated need.
For visual changes, verify both themes and compact/full-page layouts.

Never commit credentials, raw model responses, personal configuration,
`node_modules`, or local build tools. Keep `panel/main.js` and `service/main.js`
synchronized with their TypeScript sources; OpenChamber installs those bundles
without compiling them.

## Release checks

See [Release process](docs/RELEASING.md) for CI publication and native signing.
The native app pins Sparkle; do not update or remove its key/signature checks
without reviewing the upstream security guidance.


Run `bun run check:all` and confirm that rebuilding produces no bundle diff.
The package verifier creates a fresh ZIP from the explicit `package.json` file
allowlist, checks its entries, and compares extracted contents with the sources.
It rejects host-only code in the browser bundle and enforces the size budget.
Do not call a synthetic preview a live hardware test. Record any live
OpenChamber/oMLX verification separately before declaring a release qualified.

The panel uses the SDK guest bundler. The service uses stock `bun build` with
`--target=node --format=esm --minify-whitespace`; function/variable names remain
intact. The JSONC ESM import and extracted-Node-package smoke test must be kept.
The reviewed uncompressed package allowance is 224 KiB. Changes must also bound
polling, retained observations, and DOM growth; file size alone is not an
efficiency measurement. Tests cover progress and preference races as well as the
published SDK storage/clipboard message contracts.

Prefill changes must cover missing counters, incomplete stages, cache reuse,
stalled readings, and whole-token percentage boundaries. Preview failure
responses must pass the pinned SDK parser; do not lengthen browser timeouts
to compensate for an invalid synthetic host message.

Concurrent-model fixtures must retain individual model readings while withholding
ambiguous single-request headlines. Recent-history tests must distinguish a
request leaving observation from successful completion. Capture the complete
iframe content when reviewing long panels; clipped screenshots are not layout
verification.

Performance captures must remain bounded observations of existing snapshots,
not inference generators or controlled benchmarks. Cover partial windows,
counter resets, cached samples, safe integer boundaries, and reference scoping.
Draft actions must append only on explicit user input and never send a message.
Await asynchronous SDK acknowledgements before asserting clipboard results.

Native menu-bar tests must distinguish prefill progress from generation speed,
preserve remaining/completed preferences, and avoid turning missing counters
into zero remaining. Hidden CPU/memory modes must neither poll the runtime nor
inherit an active model's faster sampling cadence.

Theme changes should use the documented host tokens, not a separately stored
palette. Test a live host theme switch while paused and with the Share menu open.
Sharing must stay append-only and user-initiated.
