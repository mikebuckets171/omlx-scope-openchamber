# Privacy

OMLX Scope is an independent, local-only OpenChamber extension. It has no
analytics, crash reporting, advertising, hosted backend, or telemetry about
the extension itself.

## Local files read

The approved host service may read:

- `~/.config/opencode/opencode.json` and `opencode.jsonc`
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

## Host resources

The service reads CPU timing and free/total memory through Node's OS APIs.
On macOS it also runs the fixed, read-only commands `vm_stat` and
`sysctl vm.swapusage` at most once per ten seconds while requested.
No privileged access, persistent helper, private API, or hardware identifier
such as a serial number is used. The panel receives CPU model/core count and
numeric resource readings. Charts retain bounded in-memory history only.

On remote OpenChamber installations, these readings describe the server host.
Development-only path overrides are documented in the configuration guide;
OpenChamber does not forward arbitrary environment variables to installed services.


## Optional native Mac app

The Mac app is a separate local client. It reads CPU and memory counters through
public Mach/sysctl APIs, thermal and Low Power Mode from ProcessInfo, and battery
information from IOPowerSources. It does not use private GPU or sensor APIs.
Saved connection discovery reads only oMLX settings and the OpenCode oMLX API
credential. New keys are stored in macOS Keychain; non-secret preferences use
UserDefaults. Prompts, completions, and request IDs never enter display models.
History is bounded and held in memory. Copied diagnostics contain version and
connection state, not credentials, endpoint URLs, model names, or request data.
There is no telemetry, cloud backend, background daemon, or automatic updater.
The native app does not connect to the extension service or change OpenChamber.


## Extension view preferences and clipboard

Only two booleans (compact view and energy saving) are saved through OpenChamber's
extension storage, on explicit preference changes. They are read once per mount;
no history, runtime identifiers, or credentials are saved there. Changes in another
view are picked up when this view is reopened, not by a background watcher.

**Copy stats** uses the SDK's host clipboard only after a click. Its allowlist
contains measurement values, their age/state, and the extension version. Model
identifiers, session titles, raw errors, paths, credentials, prompts, completions,
and request identifiers are excluded. A failed clipboard request is not reported
as a successful copy. No new permission is required.


### Generation observations in the extension

The extension can retain up to eight last-seen generation summaries in its current
view's memory, including the displayed model name and numeric measurements. It does
not persist these summaries, read chat content, or receive runtime request IDs.
Closing/reloading the view clears them. Copy recent is an explicit user action and
excludes model names, credentials, paths, and request identifiers.


## OpenChamber context and captures

The extension displays the current session title, agent, and busy state supplied by
OpenChamber's SDK. It does not read the conversation or infer which request belongs
to that chat. **Add stats to chat** explicitly appends a measurement-only report to
the current composer draft; it never sends, replaces a draft, or calls a model.

A performance capture keeps two bounded summaries (current and pinned reference)
and one token counter in this view's memory. It uses existing observations, stores
nothing on disk, and ends when monitoring is interrupted. Exported captures exclude
model/session names, paths, credentials, prompts, and request identifiers. Removing
the view discards its captures. These observations are not successful-completion
records or controlled benchmarks.
