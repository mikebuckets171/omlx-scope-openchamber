# Privacy

oMLX Telemetry is an independent, local-only OpenChamber extension. It has no
analytics, crash reporting, advertising, hosted backend, or telemetry about
the extension itself.

## Local files read

The approved host service may read:

- `~/.config/opencode/opencode.json`
- `~/.omlx/settings.json`
- `~/.local/share/opencode/auth.json`

It uses these files to discover the configured numeric loopback oMLX endpoint,
selected model, and API credential. The credential is held in service memory
and is never sent to the panel or written to logs.

## Network and data flow

- Requests are sent only to the configured numeric loopback HTTP origin
  (`http://127.0.0.1:<port>`).
- The service reads health, login, model-status, session-statistics, and
  activity endpoints.
- Raw oMLX responses stay in the service process and are reduced to normalized
  scalar telemetry before crossing into the panel.
- The extension does not send prompts, completions, inference requests, model
  changes, or runtime-control requests.
- Local model IDs, token counts, cache/memory statistics, uptime, and cache-miss
  text can be visible in the OpenChamber panel.

OpenChamber services run with the user's permissions and are not sandboxed.
Install this extension only from a source you trust and review the requested
service capability before approving it.
