# Configuration

## Local discovery

The approved service reads these files on the computer running OpenChamber:

| File | Purpose |
| --- | --- |
| `~/.config/opencode/opencode.json` | oMLX provider URL and selected model |
| `~/.config/opencode/opencode.jsonc` | JSON-with-comments configuration overlay |
| `~/.omlx/settings.json` | oMLX host and port fallback |
| `~/.local/share/opencode/auth.json` | Saved oMLX API credential |

Each local file is limited to 1 MB. Oversized, non-file, or changing files are
reported as unreadable rather than loaded without a bound. JSONC is merged after JSON. An unreadable or malformed explicit configuration
does not silently switch the monitor to another endpoint. The provider key is
`omlx`, its URL is `provider.omlx.options.baseURL`, and saved credentials use
`omlx.type: "api"` with `omlx.key`.

Only HTTP on the numeric loopback address `127.0.0.1` with a non-default port
is accepted. Remote addresses, URL credentials, query strings, fragments, and
redirects are rejected. A provider path of `/v1` or `/v1/` is removed before
reading oMLX's monitoring endpoints.

The monitor does not read project-level overrides or reproduce OpenCode's
complete configuration resolver. A different provider name or configuration
source may need an explicit supported setup before discovery works.

## Troubleshooting

Open **Connection help** at the bottom of the monitor. **Check connection** asks
OpenChamber whether its extension service is starting, running, stopped, or failed.
A running extension service does not by itself mean oMLX is connected. The check
runs only when clicked and does not change settings or restart either app.

**No connection:** confirm that oMLX is running on the OpenChamber host and
that the provider points at its numeric loopback URL.

**Authentication required:** check the saved oMLX API credential through
OpenCode. Do not paste credentials into GitHub issues or the monitor panel.

**Service unavailable:** check the extension's permission in Settings →
Extensions, then reopen the panel.

**Missing Mac readings:** only macOS supplies wired, compressed, and swap
readings. The service uses `/usr/bin/vm_stat` and `/usr/sbin/sysctl vm.swapusage`
with fixed arguments, bounded output, and a timeout. Failed readings show `—`.

**Missing session statistics:** live activity can remain available while the
statistics endpoint is unavailable. Older totals are labelled rather than
presented as current.

## Development overrides

For an explicitly launched test service, `OMLX_SCOPE_BASE_URL`,
`OMLX_SCOPE_API_KEY`, and `OMLX_SCOPE_MODEL` override discovery.
`OPENCODE_CONFIG` must be an absolute path. Absolute `XDG_CONFIG_HOME` and
`XDG_DATA_HOME` values select alternative roots; relative values are ignored.

OpenChamber does not forward arbitrary parent environment variables to installed
services. These overrides are not a settings mechanism for a normal installation.
No environment variables or config files are modified by OMLX Scope.
