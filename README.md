# OMLX Scope

**Your local model and your Mac, at a glance.**

A lightweight, read-only [oMLX](https://github.com/jundot/omlx) monitor for
[OpenChamber](https://openchamber.dev). Follow inference activity, memory use,
and CPU load without leaving your workspace.

[Installation](#install-the-openchamber-extension) · [Configuration](docs/CONFIGURATION.md) ·
[Metric reference](docs/METRICS.md) · [Changelog](CHANGELOG.md)

## Features

- **Inside your workflow:** host-provided OpenChamber chat state and a one-click
  stats report appended to the chat draft. Nothing is sent automatically.
- **Prefill at a glance:** percentage remaining, processed/total tokens, and
  oMLX's current-stage estimate. Missing or held progress is never guessed.
- **Performance captures:** record 30 or 60 seconds of existing observations,
  pin a reference, and compare observed generation speed and peak footprint.
  No test prompts, persistent logs, or extra requests.
- **Inference insights:** request averages, recent generation speed, model-context
  headroom, cache reuse, loaded models, and bounded recent observations.
- **Mac resources:** CPU, non-free RAM, wired/compressed memory, and swap—even
  when oMLX is unavailable. Optional native app with a phase-aware menu bar.
- **Fits your workspace:** detailed and compact layouts, host light/dark themes,
  saved energy-saving preferences, and sanitized stats/capture copying.

Read-only runtime monitoring. No analytics, cloud backend, external fonts,
third-party chart library, or automatic inference. Context headroom is the model's
reported limit, not OpenCode's compaction threshold. Captures are observations,
not controlled benchmarks or proof that a setting caused a speed change.

## Install the OpenChamber extension

Requires **OpenChamber 1.24.0 or newer** on desktop or web, with oMLX running
on the same host.

1. Open **Settings → Extensions** in OpenChamber.
2. Paste the repository URL and select **Add**:

   ```text
   https://github.com/mikebuckets171/omlx-scope-openchamber
   ```

3. Review and approve the local service permission.
4. Open **OMLX Scope** from the extension sidebar. For a larger view, use
   **Extension pages** above the session list.

You can also install a release ZIP or a local repository folder. Built files
are included; installing the extension does not require a development toolchain.
Git-based installations receive updates through Settings → Extensions.

## Connect to oMLX

OMLX Scope reads your existing OpenCode provider configuration and saved oMLX
credential. The endpoint must use `http://127.0.0.1:<port>`; an OpenCode provider
URL ending in `/v1` is also accepted. The service never changes your configuration.

See [Configuration](docs/CONFIGURATION.md) for supported files and troubleshooting.

## Optional Mac app

Version **0.5.5** updates both the OpenChamber extension and the optional Mac app.

The native Mac companion provides a monitoring window and menu-bar popover,
with an **Activity** readout that shows **36% left** during prefill and token speed
while generating. Remaining/completed percentage is selectable in Settings.
CPU, memory, and icon-only modes remain available. It uses SwiftUI
and Apple’s resource APIs: no Electron, bundled Node runtime, or background daemon.

Download **OMLX-Scope-macOS-0.5.5.zip** from Releases on an Apple Silicon Mac
running macOS 14 or newer. Unzip and move **OMLX Scope.app** to Applications.
The native app is currently an **ad-hoc-signed preview, not notarized**. See
[Mac app setup](https://github.com/mikebuckets171/omlx-scope-openchamber/blob/main/macOS/README.md) for installation, connection, and verification limits.

## Scope and privacy

The monitor shows **server-wide activity**, not verified activity for a particular
chat. The selected chat state is provided by OpenChamber; it does not establish
which chat caused an oMLX request. On remote OpenChamber installations, resource readings belong to the server
computer, not the device displaying the panel.

Credentials remain in the local service. Prompts, completions, and request IDs
are not passed to the panel. No inference or model-control actions are exposed.
The service runs with your user permissions, so install only code you trust.
See [Privacy](PRIVACY.md) and [Security](SECURITY.md).

Mac-specific readings are unavailable on other operating systems. GPU load,
temperature, fan speed, and macOS memory pressure are not reported. The project
uses OpenChamber's documented extension surfaces. The optional native app owns
its own menu-bar item; neither component modifies OpenChamber or oMLX.

## Development

```bash
bun install --frozen-lockfile
bun run check
bunx playwright install chromium webkit
bun run test:browser
```

See [Contributing](CONTRIBUTING.md) for browser testing and release checks.

## License

[MIT](LICENSE). [Third-party notices](THIRD_PARTY_NOTICES.md).

OMLX Scope is an independent project, not affiliated with or endorsed by
OpenChamber or oMLX.
