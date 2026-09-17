# Architecture

OMLX Scope has two components: a sandboxed OpenChamber panel and one host-managed
local service. The compact panel and full-page view share the same implementation.

## Data flow

```text
OpenChamber panel → SDK serviceRequest → authenticated loopback service
                                       ├─ oMLX monitoring endpoints
                                       └─ host OS readings
```

The panel uses `connectHost`, the host's theme tokens, and documented panel/page
manifest entries. It has no direct network, filesystem, command execution, or
credential access. The service accepts only authenticated GET requests to
`/health` and `/snapshot`. Runtime and host failures are isolated.

## Resource budget

| Work | Limit |
| --- | --- |
| Active inference polling | No faster than every 500 ms per visible panel |
| Idle polling | Every 2 seconds |
| Failed oMLX reads | Shared exponential retry delay, capped at 15 seconds |
| Basic host observations | Shared cache, at most once every 2 seconds |
| macOS commands | Two fixed commands, at most once every 10 seconds |
| Command timeout/output | 1.5 seconds and 64 KiB per command |
| Runtime requests | 3 seconds per request, within an 8-second collection budget |
| Upstream response body | 2,000,000 bytes maximum |
| Chart history | 90 seconds; at most 200 inference and 100 host observations |
| Installable assets | 160 KiB maximum before compression |

There is no background sampling timer in the service. Consumers share pending
requests and cached observations. The UI patches a stable DOM rather than
recreating controls; only changed text and chart geometry are updated. Hidden
or paused panels do not schedule requests. No persistent telemetry store,
additional daemon, or native companion is installed.

These are enforced implementation limits, not measured CPU or battery claims.

## Verification

Unit and loopback integration tests cover normalization, credentials, request
limits, failure isolation, parsing, scheduling, and chart boundaries. CI also
runs native command smoke tests on macOS and the built panel in Chromium and
WebKit with synthetic SDK messages. Browser tests verify both themes, compact
and full-page layouts, disclosure/focus stability, pause/resume, stale responses,
and unavailable readings. Synthetic previews never connect to a real model.
