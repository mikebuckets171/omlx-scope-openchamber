# oMLX Telemetry for OpenChamber

An independent third-party OpenChamber extension for a calm, read-only view of
local [oMLX](https://github.com/jundot/omlx) inference activity. It uses the
official OpenChamber guest SDK and does not patch OpenChamber's React surface,
web server, or runtime.

> **Independent software:** this project is not affiliated with, sponsored by,
> or endorsed by OpenChamber, oMLX, or the RapidScope macOS application.

## What it does

- Shows the current inference phase and live signal in a glanceable panel.
- Keeps the visual surface intentionally focused: one live readout, one signal
  trace, and compact runtime/resource/session sections.
- Reads only local oMLX telemetry and exposes no prompt, completion, or runtime
  control action.
- Keeps credentials in the host service; the panel receives normalized scalar
  telemetry only.

## Build

```bash
bun install --frozen-lockfile
bun run check
```

The checked-in installable package is the folder itself. It contains:

- `package.json` with the OpenChamber manifest;
- `panel/index.html` and the built `panel/main.js` guest page;
- the built `service/main.js` local service;
- the license, privacy, security, and third-party notices.

## Install from GitHub

1. Download this repository as a ZIP, or clone it with Git.
2. If you cloned the source repository, run `bun install --frozen-lockfile`
   followed by `bun run check`.
3. In OpenChamber **1.24.0 or newer**, choose **Settings → Extensions → Add**
   and select the repository folder.
4. Approve the requested local-service capability, then open **oMLX
   Telemetry** from the extension rail.

The renamed `omlx-telemetry` panel is a new OpenChamber extension identity. If
you previously installed the older `rapidscope` build, remove it before adding
this one so the host does not retain both panels.

The service runs wherever OpenChamber runs. For a remote OpenChamber server,
“local” means the server's machine, not necessarily your Mac. OpenChamber
services run with the user's permissions and are not sandboxed; this service
still binds its own listener only to `127.0.0.1`.

## Runtime configuration

The service reads the existing local OpenCode/oMLX configuration on the host:

- `~/.config/opencode/opencode.json` for an `omlx` provider `options.baseURL`
  and the selected `omlx/<model>`;
- `~/.omlx/settings.json` for the native oMLX `server.host` and `server.port`
  fallback;
- `~/.local/share/opencode/auth.json` for the `omlx` API credential.

Only numeric loopback HTTP origins (`http://127.0.0.1:<port>`) are accepted.
The credential is read and used by the service process; it is not passed to the
panel or logged. The panel receives only normalized scalar telemetry.
The session panel also surfaces oMLX's weighted prefill average, decode average,
and cache-efficiency percentage; these aggregates are scoped to the oMLX server
session/statistics reset and are not current request rates.

For isolated local tests, `OMLX_TELEMETRY_BASE_URL`, `OMLX_TELEMETRY_API_KEY`,
and `OMLX_TELEMETRY_MODEL` may be supplied to the service process.
OpenChamber's host intentionally does not forward arbitrary parent environment
variables to installed services, so normal installs should use the files above.

## Development and release

```bash
bun install --frozen-lockfile
bun run check
```

`bun run check` type-checks, runs the fixture suite, and rebuilds the checked-in
guest bundles. Releases must include `panel/main.js` and `service/main.js`;
OpenChamber does not compile the TypeScript sources at install time.

Before publishing a release, verify that `git diff -- panel/main.js service/main.js`
is clean after the build. The GitHub Actions workflow performs the same check.

## Compatibility and scope

- OpenChamber: `1.24.0+` (official guest SDK `1.24.0`).
- Host surfaces: OpenChamber web and desktop. VS Code and mobile are not
  currently supported by the host.
- oMLX: the local health, login, model-status, session-stats, and activity API
  shapes used by the service client.
- Read-only: the extension exposes no prompt, inference, model, or runtime
  control action.

## Privacy and security

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md). In short, the
extension has no analytics or remote backend. It reads local configuration and
uses the configured credential only for approved loopback oMLX requests. The
service is intentionally local, but OpenChamber service processes are not
sandboxed and should be installed only from a source you trust.

## License

This project is available under the [MIT License](LICENSE). Runtime dependency
notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
