# Contributing

## Run the project

Use Bun 1.3.14 and Node 22 or newer. The extension ships its built JavaScript, so
keep `panel/main.js` and `service/main.js` in sync with source changes.

```sh
bun install --frozen-lockfile
bun run check
bunx playwright install --with-deps chromium webkit
bun run test:browser
```

`bun run check` runs type checks, unit/integration tests, builds both bundles, and
starts the service from an extracted installation ZIP without `node_modules`.
On macOS, that package check also verifies wired memory, compression, and swap
through seven fresh Node service processes. Each read must pass within the
production deadline; failed reads are not retried until they pass.

The browser suite starts its own local preview server. `bun run preview` starts
that server for interactive work; its readings are synthetic, not from oMLX.
DFlash checks cover preparation, observed output, frozen readings, and fallback
prefill. Shared fixtures keep Swift and TypeScript interpretations aligned.

On a Mac, run `swift test --package-path macOS` for native tests and
`./script/build_and_run.sh --verify` to build and open the companion.

## Propose a change

Describe the user-visible problem and add a regression test. Keep unrelated
changes out of the pull request. For interface changes, check compact/full-page
layouts, light/dark themes, narrow widths, keyboard use, and reduced motion.
Keep controls mounted during updates so focus and user choices are preserved.

Use documented OpenChamber APIs and theme tokens. Monitoring remains read-only;
sharing must append only after a click and never send a message. Missing values
are not zero. Runtime observations must not be attributed to a chat or reported
as successful completions without evidence.

New dependencies, permissions, requests, or retained data need an explanation.
Histories and network responses must stay bounded. The extracted extension
budget is 224 KiB; download size alone does not establish runtime efficiency.

Never commit credentials, private model output, local configuration, build
caches, or signing keys. Preserve license notices. Label synthetic screenshots
and state which live configurations were actually tested.

## Release

Use the [release guide](https://github.com/mikebuckets171/omlx-scope-openchamber/blob/main/docs/RELEASING.md).
CI publishes packages from a verified main commit. Developer ID signing,
notarization, and signed update testing require the owner’s release credentials;
an ad-hoc preview does not establish that upgrade path.
