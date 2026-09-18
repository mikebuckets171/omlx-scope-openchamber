# OMLX Scope

**Your local model and your Mac, at a glance.**

A lightweight, read-only [oMLX](https://github.com/jundot/omlx) monitor for
[OpenChamber](https://openchamber.dev). Follow inference activity, memory use,
and CPU load without leaving your workspace.

[Installation](#install-the-openchamber-extension) · [Configuration](docs/CONFIGURATION.md) ·
[Metric reference](docs/METRICS.md) · [Changelog](CHANGELOG.md)

## Features

- **Prefill clarity:** percentage remaining, exact processed/total counts, and
  oMLX's estimated time left for the current stage when reported.
- **Recent generation speed:** a short observation-window rate alongside the
  runtime's request average, so changes do not disappear into a long average.
- **Recent generations:** up to eight last-seen observations with token counts,
  reported average speed, and peak observed process footprint. Memory-only;
  not a log of confirmed completions.
- **Cache and model visibility:** reused versus unreused input, RAM/SSD cache
  sizes, and a bounded roster showing simultaneous model activity.

- **Prefill remaining:** a visible percentage and processed/total token counts for
  the current runtime stage. Missing and stale progress are labelled, never guessed.
- **Chat-friendly controls:** a compact view, saved energy-saving preference, and
  a Copy stats action that excludes credentials, chat text, model names, and paths.
- **Inference activity:** request phase, reported token speed, context usage,
  prefix reuse, and a 90-second history.
- **Mac resources:** CPU load, memory occupancy, wired and compressed memory,
  and swap usage. Host readings remain available when oMLX is offline.
- **Two views:** a compact sidebar panel and a full-page workspace, with
  OpenChamber's light and dark themes.
- **Clear states:** missing values stay unavailable; paused and older readings
  are identified. Pause affects the monitor, never your model.

No analytics, cloud backend, external fonts, or third-party charting framework.
The leaf button reduces extension refresh frequency without pausing inference.

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

The native companion remains at **0.5.2**; **0.5.4 is an extension-only update**.

The native Mac companion provides a monitoring window and menu-bar popover,
with selectable token-speed, CPU, memory, or icon-only readouts. It uses SwiftUI
and Apple’s resource APIs: no Electron, bundled Node runtime, or background daemon.

Download **OMLX-Scope-macOS-0.5.2.zip** from Releases on an Apple Silicon Mac
running macOS 14 or newer. Unzip and move **OMLX Scope.app** to Applications.
The native app is currently an **ad-hoc-signed preview, not notarized**. See
[Mac app setup](https://github.com/mikebuckets171/omlx-scope-openchamber/blob/main/macOS/README.md) for installation, connection, and verification limits.

## Scope and privacy

The monitor shows **server-wide activity**, not verified activity for a particular
chat. On remote OpenChamber installations, resource readings belong to the server
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
