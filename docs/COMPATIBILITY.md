# Compatibility

## Reviewed versions

The 0.5.8 pass compares Scope with these tagged upstream releases:

| Project | Reference | What was checked |
| --- | --- | --- |
| oMLX | [0.6.4](https://github.com/jundot/omlx/tree/1d7826185c5b5b69b38b27cbe57d7597b7551fd7) | Activity, session statistics, cache lookup, authentication, and model-context responses |
| OpenChamber | [1.24.2](https://github.com/openchamber/openchamber/tree/614d7f76e581a132a86575c03d3fa9aad5e624b6) | Published SDK, guest-service contract, theme and chat-draft APIs, and Turn Stats |

The extension pins SDK 1.24.2. Its existing minimum host requirement remains
1.24.0; it does not use the newer background-action surface. Web and desktop
extension clients are supported. The Mac companion requires Apple Silicon and
macOS 14 or later. oMLX itself has its own platform requirements.

This is a source-contract review backed by synthetic fixtures and automated
checks, not certification of every installed OpenChamber/oMLX combination.
Dashboard endpoints can change between oMLX versions. Live model runs, VoiceOver,
long-running battery use, Keychain authorization dialogs, and notarized upgrades
must be tested separately on the intended installation.

## Monitoring coverage

| Reading or behavior | Extension | Mac companion |
| --- | --- | --- |
| Prefill percentage, stage counters, reported estimate | Supported | Supported, including menu bar |
| Request-average generation speed; stale output detection | Supported | Supported |
| Input reuse proven by the same request's cache lookup | Supported | Supported |
| Prompt plus output against the model context limit | Supported | Supported; optional limit read at most once a minute |
| Active and queued requests; proven queue overlap | Supported | Supported |
| Concurrent requests | Single-request headline withheld | Single-request headline withheld |
| Non-streaming operations, loading, idle and missing state | Distinct from token generation | Distinct from token generation |
| Process footprint, model allocation and physical cache storage | Kept separate | Kept separate |
| Host CPU, memory and swap | OpenChamber server's machine | The Mac running Scope |
| Host thermal state and power information | Not exposed | Public macOS APIs |
| Recent counter-based speed, saved chart readings, comparison captures | Supported | Not duplicated in the companion |
| Multi-model roster | Supported | Current model summary |
| OpenChamber theme and draft sharing | Supported | Not applicable to a native companion |

The native companion and extension remain separate clients; running both creates
some duplicate monitoring traffic. Their sampling intervals deliberately differ.
Neither starts inference to obtain measurements. Missing values are not zero,
prefill completion is not rounded early, and observations are not completion logs.

Both normalizers run the same cases from `tests/fixtures/omlx-monitoring.json`.
The values are synthetic and exercise valid, missing, stale, malformed, concurrent,
and request-mismatched data. Shared JSONC cases verify comments, trailing commas,
quoted text and rejection of malformed configuration. The Swift tests read these
fixtures from the source checkout; no fixture or test runner ships in the app.

## Connection and permission behavior

Both clients use the configured numeric loopback endpoint and identify its oMLX
health response before sending credentials. They refuse redirects. An API key is
used when present. With no key, only ordinary read requests are attempted; they
succeed only if the server already permits them. A rejected supplied key is never
retried without authentication. Scope does not change oMLX's authentication policy.
The OpenChamber service's own authorization token is always required.

The Mac app now reads the same supported OpenCode JSON/JSONC provider settings,
absolute XDG roots and explicit configuration override as the extension, with
read-size limits and no configuration writes. A malformed explicit setting does
not silently redirect monitoring to the default server. Per-project discovery and
unresolved OpenCode configuration substitutions are not implemented.

Keychain reads, writes and deletion are explicit Settings actions, not startup or
polling side effects. New manually entered keys stay in memory by default. An
existing Keychain item is not migrated, deleted, or given broader access controls
on upgrade. Choose **Use Keychain Key** to open it for the current launch, or use
the existing OpenCode connection instead. No new plaintext credential file is used.

## OpenChamber integration boundaries

Panel, full-page view, session shortcut, live theme tokens, storage, clipboard,
chat-draft composition, and local service status use the published SDK. Repeated
host-ready notifications update theme/context without remounting the monitor or
creating new polling loops. Sharing is user-initiated and append-only; it never
sends a message.

OpenChamber's **Turn Stats** remains separate. The reviewed SDK provides neither
a Turn Stats row-contribution hook nor a reliable mapping between a runtime
request and a completed chat turn. Scope does not patch that interface, scrape
conversation messages, or label server-wide observations as a particular turn.
The newer background-action API is not needed for passive monitoring.

DFlash activity in the reviewed release can use the engine's generic activity
records rather than the scheduler's prefill/generation records. Scope shows that
work as processing; it does not invent prefill percentages, acceptance rates, or
per-request speed from unrelated session totals. Lightning MTP readings use the
same validated activity counters when the runtime provides them.

Model loading, inference settings, benchmarks, cache clearing, and speculative-
decoding controls stay in oMLX. Scope is a read-only monitor, not a second runtime
control panel. It makes no changes to the installed OpenChamber or oMLX source.
