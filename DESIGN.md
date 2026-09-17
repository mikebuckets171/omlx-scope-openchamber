# OMLX Scope · design and operating budget

One question: **what is my local model doing, and how is my Mac handling it?**

The signature is a quiet, timestamped scope trace—not a wall of metric cards.
The waveform and the current request share one open surface. The Mac gets a
separate, cool-toned resource strip; session aggregates sit below it. Runtime
details are a disclosure, not a competing dashboard. No repeated model names,
project paths, animated ambient effects, external fonts, charts library, or UI
framework.

## Visual vocabulary

- Graphite `#10151b`, inset slate `#1b252e`, ink-white `#e9f0f5`, muted steel
  `#9aa9b7`, signal mint `#7dd9bd`, system blue `#86b7ed`.
- Light: paper `#f7f9fb`, ink `#172a37`, muted `#596977`, mint `#197e68`.
- Production colors adapt to the OpenChamber host's semantic tokens. The palette
  above is the review fixture, not a forced theme.
- System sans for hierarchy, proportional display numerals with tabular digits,
  monospace only for small quantitative comparisons.
- 24px outer inset, one 10px system surface, hairlines where scope changes.
- Generating uses mint, reading uses blue, waiting/reconnecting uses amber.
  Text always states the phase; color is supplementary.

## Honest readings

Throughput is oMLX's **current request average**, not an interval-speed estimate.
A fixed 90-second horizontal domain and zero vertical baseline avoid stretching
or exaggerating short captures. Request/model/phase changes and lost samples
break the trace. Missing measurements remain unavailable. No completion ledger
is synthesized from server totals.

Host CPU is a delta of OS counters. Non-free RAM is physical minus OS-reported
free memory and includes reclaimable pages. Neither is specific to oMLX or an
equivalent of macOS memory pressure. Process footprint is only shown when the
runtime explicitly reports it through its enabled memory guard.

## Work budget

- One pending SDK request and one timer; 500ms active, 2s idle, up to 15s retry.
- Pause when the document is hidden; resume on visibility and bfcache restore.
- Stable DOM; no dashboard replacement or refresh spinner on automatic polls.
- Service coalesces concurrent consumers and caches snapshots for 450ms.
- Config/credential files: at most every 5s; stats: 3s; model limits: 60s.
- Host CPU/RAM sample: at most every 2s, no subprocess or privileged helper.
- Bounded trace (200 points), response (2MB), and full-request deadline (3s).

## Verification surface

`bun run preview` is an isolated synthetic SDK host. Query `?theme=light`,
`?state=idle`, `prefill`, `queued`, `notLoaded`, `offline`, `auth`, or `reconnect`.
`&long=1` exercises long model names. It never reads local config or calls oMLX.
