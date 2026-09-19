<div align="center">

# OMLX Scope

**Your local model, in view.**

Live oMLX monitoring inside OpenChamber, with an optional native Mac companion.

[Install](#install) · [Metrics](docs/METRICS.md) · [Configuration](docs/CONFIGURATION.md) · [Contributing](CONTRIBUTING.md)

</div>

OMLX Scope brings the readings you care about beside your conversation: prefill
progress, token speed, cache reuse, and your Mac’s resources. It complements
oMLX’s dashboard rather than replacing it.

<!-- Product screenshots use synthetic readings, never a performance claim. -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/mikebuckets171/omlx-scope-openchamber/releases/download/v0.5.8/extension-dark.png">
  <img alt="OMLX Scope full-page monitor" src="https://github.com/mikebuckets171/omlx-scope-openchamber/releases/download/v0.5.8/extension-light.png">
</picture>

*Full-page extension view with sample data. The panel follows OpenChamber’s theme.*

## Inside OpenChamber

- **Follow inference:** prefill percentage remaining, processed tokens, reported
  stage-time estimates, request-average speed, and recent observed speed.
  Inspect past chart readings with the pointer or arrow keys.
- **Understand the workload:** cache reuse, model-context headroom, loaded models,
  CPU, memory, and swap—with unavailable or held readings clearly identified.
- **Compare observations:** capture 30 or 60 seconds, pin a reference, then compare
  a similar run. No benchmark prompts or extra inference are started.
- **Stay in the conversation:** compact mode keeps the essentials close. The
  Share menu copies a measurement report or adds it to your chat draft on click.
  Nothing is sent automatically.

Uses OpenChamber’s documented panel, full-page, theme, storage, clipboard, and
composition APIs. No host patches. Runtime observations remain **server-wide**;
they are not guaranteed to belong to the selected chat.

OpenChamber’s **Turn Stats** remains its per-turn view. Scope adds live server
readings alongside it; it does not attach server activity to individual turns.

## Install

### OpenChamber extension

Requires **OpenChamber 1.24.0 or newer** on **web or desktop**, with oMLX
on the computer running the OpenChamber server. OpenChamber extensions are not
available in its mobile or VS Code clients. Mac-specific readings require macOS.

In **Settings → Extensions**, add this repository and review the permissions:

```text
https://github.com/mikebuckets171/omlx-scope-openchamber
```

Alternatively, install `omlx-scope-openchamber-0.5.8.zip` from
[Releases](https://github.com/mikebuckets171/omlx-scope-openchamber/releases/latest).
The installable ZIP includes the built files; the GitHub source archives are not
extension installation packages. If readings are missing, open **Connection help**
at the bottom of the monitor. **Check connection** checks OpenChamber’s service
status; **Setup guide** opens the configuration instructions.

### Mac companion

Download `OMLX-Scope-macOS-0.5.8.zip` from the same release, quit the old app,
and move **OMLX Scope.app** into your Applications folder. Requires **Apple Silicon and
macOS 14 or newer**. Install it separately from the extension.

Startup and monitoring do not open Keychain. The app can use your saved OpenCode
connection; a new manually entered API key stays in memory unless you explicitly
choose Keychain storage. See the [Mac connection guide](https://github.com/mikebuckets171/omlx-scope-openchamber/blob/main/macOS/README.md) for password-prompt details.

The Activity menu-bar readout shows **36% left** during prefill, then switches
to token speed during generation. The popover and full window show more detail.

**Mac builds are currently ad-hoc-signed previews, not notarized.** Check for
Updates finds new Mac releases on GitHub; optional daily checks are available.
Automatic installation is enabled only in properly configured Developer ID
builds. See the [Mac guide](https://github.com/mikebuckets171/omlx-scope-openchamber/blob/main/macOS/README.md) and
[release-signing guide](https://github.com/mikebuckets171/omlx-scope-openchamber/blob/main/docs/RELEASING.md) for the distinction.

## Small by design

The extension uses vanilla TypeScript, the OpenChamber SDK, and existing oMLX
monitoring responses. Histories and captures are bounded, updates slow when idle,
and hidden extension views stop polling. The native app uses SwiftUI; only
Developer ID builds include Sparkle for signed updates. Preview builds have no
installer framework, browser, or Node runtime.

The app and extension are independent clients. Running both can produce two sets
of oMLX monitoring requests. Download size is not a measurement of runtime
memory, energy use, or inference impact.

## Trust and compatibility

The [compatibility notes](https://github.com/mikebuckets171/omlx-scope-openchamber/blob/main/docs/COMPATIBILITY.md)
cover the oMLX 0.6.4 and OpenChamber 1.24.2 review, shared-reading tests, and
intentional differences between the extension and Mac app.

The local service runs under your user account, outside the panel’s browser
sandbox. Approve it only after reviewing the source and permissions. Its
read-only behavior is a project boundary, not an operating-system sandbox.

Monitoring is read-only: no prompts, model loading, runtime tuning, or cache
clearing. Reports exclude credentials and conversation content. There is no
analytics service. Optional Mac update checks contact GitHub.

Some readings use oMLX’s dashboard endpoints, whose response format is
version-dependent. Captures are observations, not controlled benchmarks or
proof of successful completion. See [metric definitions](docs/METRICS.md),
[privacy](PRIVACY.md), and [security](SECURITY.md).

## Development

```sh
bun install --frozen-lockfile
bunx playwright install --with-deps chromium webkit
bun run check:all
swift test --package-path macOS       # native tests on a Mac
./script/build_and_run.sh --verify    # build and open the Mac app
```

CI starts the service from the extracted installation package and checks its
included documentation links. Browser tests cover Chromium and WebKit; native
checks run on macOS ARM64. Synthetic previews are separate from live
OpenChamber/oMLX validation.

[Architecture](https://github.com/mikebuckets171/omlx-scope-openchamber/blob/main/docs/ARCHITECTURE.md) · [Release process](https://github.com/mikebuckets171/omlx-scope-openchamber/blob/main/docs/RELEASING.md) ·
[Third-party notices](THIRD_PARTY_NOTICES.md) · [MIT license](LICENSE)

Independent community project; not affiliated with OpenChamber, oMLX, or Apple.
