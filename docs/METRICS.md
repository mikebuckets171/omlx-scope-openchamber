# Metric reference

Missing or unsupported measurements display `—`. A zero is displayed only when
it is reported or can be derived from complete observations.

| Reading | Meaning |
| --- | --- |
| Token speed | The active request's reported average, not instantaneous throughput |
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

## History and freshness

Inference and host charts have a fixed 90-second time window. Throughput starts
at zero; host percentages use a fixed 0–100% scale. Pauses, connection loss,
missing values, request changes, and large sampling gaps break the trace.
History is bounded in memory and is not written to disk.

Polling pauses when the panel is hidden or manually paused. The interface marks
a stalled response as stale after six seconds instead of leaving a live speed
on screen. Resuming waits for a new reading. Concurrent requests do not become
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
