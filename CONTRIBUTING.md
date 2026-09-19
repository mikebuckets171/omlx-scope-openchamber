# Contributing

Bug reports should include the app version, OpenChamber/oMLX versions, what you
expected, and a small reproduction. Remove credentials, private conversations,
and local paths from screenshots and logs. Report security issues privately using
[the security policy](SECURITY.md).

## Develop

```sh
bun install --frozen-lockfile
bun run check
bunx playwright install chromium webkit
bun run test:browser
```

`bun run preview` starts a synthetic preview, not a connection to your oMLX server.
`bun run check` covers types, tests, both production bundles, and the extracted
installation package. `bun run check:all` also runs the browser suite. On Linux,
macOS-only tests are skipped; CI runs them on a Mac.

For the native companion, run `swift test --package-path macOS` on a Mac.
See the [Mac guide](https://github.com/mikebuckets171/omlx-scope-openchamber/blob/main/macOS/README.md)
for build instructions.

## Review checklist

- Keep monitoring read-only and use documented OpenChamber APIs. Never patch
  the host or attribute server readings to a chat without a reliable identity.
- Add regression coverage for changed behavior. Cover missing, stale, and
  concurrent readings; keep histories, requests, and update intervals bounded.
- Check narrow, compact, and full-page layouts in both themes. Keyboard focus,
  open details, and an active capture must survive ordinary monitoring updates.
- Keep the generated `panel/main.js` and `service/main.js` synchronized with
  their source. Installations use these files without building them.
- Preserve licenses and record dependency changes. Never commit credentials,
  raw model responses, personal configuration, build tools, or `node_modules`.

Next-reply captures use selected-chat state only to choose a recording interval.
Tests must cover cancellation, chat changes, cached samples, and incomplete
observations. Idle does not prove success. Sharing may append a report to a draft
only after a click; it must never send the message.

The service's JSONC ESM import and extracted-package Node smoke test protect
against startup regressions. Do not weaken them to make a build pass. Theme
changes should use host tokens, not a separately stored palette. File-size
budgets are useful checks, not runtime performance measurements.

## Releases

See [the release process](https://github.com/mikebuckets171/omlx-scope-openchamber/blob/main/docs/RELEASING.md).
Published files come from the exact passing main-branch build. Synthetic tests
are not live hardware results. Preview Mac builds are not notarized and cannot
install updates; the signed release path needs publisher credentials.
