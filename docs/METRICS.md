# Metric reference

Missing or unsupported measurements display `—`. A zero is displayed only when
it is reported or can be derived from complete observations.

| Reading | Meaning |
| --- | --- |
| Token speed | Generation is the active request's reported average; prefill is the runtime's reported progress speed, not an ETA |
| Prefill remaining | `(total - processed) / total × 100` for the current runtime stage; zero/missing/contradictory totals are unavailable |
| Context | Reported prompt tokens divided by the model's reported context window; not OpenCode's compaction threshold |
| Prefix reused | Verified cached tokens divided by reported prompt tokens |
| Requests | Server-wide active and queued counts; unknown counts are not zero |
| Server session | Completed-work aggregates across models, since the server's statistics reset |
| CPU | Change in non-idle time across all logical cores between host observations |
| Non-free RAM | Physical memory minus OS-reported free memory; includes reclaimable pages and is not Activity Monitor's Memory Used |
| Wired | Physical memory marked wired by `vm_stat` |
| Compressed | Physical pages occupied by the compressor, not the logical size of compressed pages |
| Swap used | Current swap usage reported by `sysctl vm.swapusage` |
| oMLX process footprint | Memory reported by oMLX's enabled process memory guard |
| Model allocation | Reported model allocation, distinct from process footprint |
| Runtime memory guard | oMLX's own guard state, not macOS memory pressure |

Memory is displayed in **GiB**, where 1 GiB is 1,024³ bytes. Native VM page size
is read from the command output; it is not assumed to be 4 KiB.

## Prefill progress

Remaining percentage uses oMLX's **processed** and **total** counters. Cached
prefix reuse is shown separately and is not subtracted from this total again.
The stage can change during multi-stage or speculative prefill: its progress is
not a whole-request percentage and does not predict time to completion. Incomplete
work below one percent remaining displays `<1%`, never a premature zero.

A connected request whose counters stop advancing for 15 seconds is labelled
**Waiting for progress**. Its last percentage remains visible but is identified
as a held reading; live speed is withheld. Pause holds observations with a clear
label. Disconnecting or moving into generation removes the prefill card. Missing
counts display **Progress unavailable**, not zero. Older service responses that
supply only a valid progress fraction remain readable without invented counts.

The mapping was checked against oMLX's `omlx/prefill_progress.py` at revision
`ca32d928ca561af4921a6724de89adee9d70c7b3`. It does not introduce an additional
runtime request or inference operation.

## History and freshness

Inference and host charts have a fixed 90-second time window. Throughput starts
at zero; host percentages use a fixed 0–100% scale. Pauses, connection loss,
missing values, request changes, and large sampling gaps break the trace.
History is bounded in memory and is not written to disk. Energy-saving updates
keep a cadence-aware gap threshold; ordinary three-second samples form a line
while pauses and actual missing observations remain gaps. Compact mode keeps
bounded observations but skips geometry updates for its hidden charts.

Polling pauses when the panel is hidden or manually paused. The interface marks
a stalled response as stale after six seconds (ten with energy-saving updates)
instead of leaving a live speed on screen. Resuming waits for a new reading. Concurrent requests do not become
a fabricated single-request speed.

## Data sources and compatibility

The panel communicates only through the official OpenChamber guest SDK. A
host-managed local service reads oMLX's health, admin login, model status,
session statistics, and activity endpoints. Login establishes a session;
monitoring does not send inference requests or runtime control commands.

These oMLX dashboard endpoint shapes are version-dependent, not a promise of a
stable third-party API. Fixtures cover the shapes used by this client, including
the repository's oMLX 0.7.0.dev3 compatibility baseline. A successful fixture test
is not a live OpenChamber/oMLX hardware test. Unsupported shapes remain unavailable.

The host resource sampler uses Node's public OS APIs and macOS command-line
utilities. No private GPU, thermal, fan, or memory-pressure API is used.


## Session insights (0.5.4)

**Stage estimate** comes from oMLX's `prefilling[].eta`, provided with valid
processed/total counters and positive reported speed. It is rounded up for display,
updated only when a new sample arrives, and removed for paused, stale, malformed,
completed, or ambiguous stages. It is not time to first token or time to completion;
stages may change, and oMLX can revise its estimate. No synthetic countdown runs.

**Recent speed** is the change in generated-token counts divided by observed wall
time over up to ten seconds. It needs at least three samples spanning two seconds.
It is separate from oMLX's request average and is not an instantaneous GPU measure.
The window resets for a different request/model, backwards counters/clocks,
missing identity, stale output, or monitoring gaps. It holds at most 24 points.

**Recent generations** keeps eight last-seen generation observations in this view's
memory. A disappearing request might have completed, been cancelled, or become
unobservable. Therefore rows are labelled *No longer observed* or *Monitoring gap*,
never successful completions. Output totals and average speed are the last sample,
not guaranteed final totals. Peak footprint is the maximum *observed* process value,
not peak GPU memory or memory solely attributable to that request. Hidden/pause/offline
boundaries end the observation. Nothing is recorded while the view is closed.
Reloading clears it. Copy recent strips model names, paths, raw errors and request
identifiers; Clear history affects only the view, not oMLX statistics.

**Cache & input** uses reported prompt and reused tokens. Unreused input is not
necessarily a prefill-stage size, particularly for staged or selective prefills.
RAM/SSD cache sizes are server-wide session statistics, separately labelled if
unavailable/stale; overlapping categories are not added to model allocations.

**Loaded models** exposes up to 12 allowlisted summaries from the existing activity
response, with the reported total count. Multiple models can each show a valid
single-request rate, while the main summary withholds ambiguous combined rates.
Concurrency within one model still suppresses its per-request rate/progress.
This roster neither loads/switches models nor assigns activity to a selected chat.

The extension makes no additional oMLX requests for these views. They share existing
polls, and no background timer, database, watcher, or library was added. The reviewed
uncompressed installation allowance is 224 KiB; it is a packaging guardrail, not a
claim about process memory or battery consumption.
