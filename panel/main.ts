import { connectHost } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';
import { parseTelemetrySnapshot, unavailableTelemetry, type AvailableTelemetry, type TelemetryPhase, type TelemetrySnapshot } from '../src/telemetry.ts';
import { SignalHistory, nextDelay, traceGeometry } from './signal.ts';
import { ResourceHistory, toGiB } from './resources.ts';
import type { SystemSnapshot } from '../src/system.ts';
import { unavailableForHostError, unavailableForServiceResponse } from './host-errors.ts';
import { Poller } from './poller.ts';

const host = connectHost();
const root = document.querySelector<HTMLElement>('#root');
if (!root) throw new Error('OMLX Scope is missing its root element.');

// This static shell is mounted once. Polls patch text/geometry, never controls.
root.innerHTML = `
<main class="scope" aria-labelledby="scope-title">
  <header class="masthead">
    <div class="brand"><svg class="scope-mark" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11"/><path d="M3 14h6l3-5 4 10 3-5h6"/></svg><h1 id="scope-title">OMLX <span>Scope</span></h1></div>
    <div class="monitor-controls"><button id="efficiency" type="button" aria-label="Energy-saving updates" aria-pressed="false" title="Energy-saving updates: reduce monitoring refresh frequency"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 3c-8-1-13 3-10 9s10 1 10-9ZM4 16l8-8"/></svg></button><button id="pause" type="button" aria-pressed="false" title="Pause this monitor, not inference"><svg viewBox="0 0 20 20" aria-hidden="true"><path id="pause-symbol" d="M7 5v10M13 5v10"/></svg><span id="pause-label">Pause</span></button><button id="refresh" type="button" title="Refresh local telemetry" aria-label="Refresh local telemetry"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 7a6 6 0 1 0 .1 5M16 3v4h-4"/></svg></button></div>
  </header>
  <div class="connection"><span class="connection-dot" aria-hidden="true"></span><span id="connection" role="status">Connecting to oMLX</span><span class="local-tag">LOCAL / READ ONLY</span></div>
  <p id="notice" class="notice" role="status" hidden></p>
  <div class="workspace">
  <section class="instrument" aria-label="Inference activity">
    <div class="model-line"><span class="eyebrow">INFERENCE</span><span id="phase" class="phase">Connecting</span></div>
    <h2 id="model" translate="no">Your local model</h2>
    <div class="readout"><span id="rate" class="rate">—</span><span id="unit" class="unit">Waiting for telemetry</span></div>
    <p id="activity" class="activity">Verifying the approved local service.</p>
    <div id="prefill-track" class="progress-track" role="progressbar" aria-label="Prompt reading progress" aria-valuemin="0" aria-valuemax="100" hidden><span></span></div>
    <figure id="signal" class="signal" role="img" aria-label="No observed throughput yet">
      <div class="chart-top"><span id="chart-title">Request throughput</span><span id="ceiling">tok/s</span></div>
      <div class="plot"><svg viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true"><path class="grid" d="M4 4H596 M4 60H596 M4 116H596"/><g id="trace"></g><circle id="cursor" r="3" hidden/></svg><span id="chart-empty">The next request starts here.</span></div>
      <figcaption><span>−90s</span><span id="chart-state">Observed samples only</span><span id="chart-end">now</span></figcaption>
    </figure>
    <div class="metrics" aria-label="Current request">
      <div><span class="metric-label">Context</span><strong id="context">—</strong><span id="context-detail" class="metric-detail">Not reported</span><div class="meter" aria-hidden="true"><i id="context-bar"></i></div></div>
      <div><span class="metric-label">Prefix reused</span><strong id="reuse">—</strong><span id="reuse-detail" class="metric-detail">Not reported</span><div class="meter" aria-hidden="true"><i id="reuse-bar"></i></div></div>
      <div><span class="metric-label">Requests</span><strong id="requests">—</strong><span id="queue" class="metric-detail">Waiting for oMLX</span></div>
    </div>
  </section>
  <aside class="side-stack" aria-label="Host resources and server statistics">
  <section id="machine" class="machine" aria-labelledby="machine-title" hidden>
    <div class="section-heading"><h2 id="machine-title">Host resources</h2><span id="machine-freshness">Waiting for a sample</span></div>
    <p id="hardware" class="hardware"></p>
    <div class="machine-values"><div><span>CPU</span><strong id="cpu">—</strong><div class="meter" aria-hidden="true"><i id="cpu-bar"></i></div></div><div title="Physical memory minus OS-reported free memory. Includes reclaimable pages; not Activity Monitor’s Memory Used or memory pressure."><span>Non-free RAM</span><strong id="ram">—</strong><div class="meter" aria-hidden="true"><i id="ram-bar"></i></div></div></div>
    <figure class="resource-trace" role="img" aria-label="CPU and non-free memory over the last 90 seconds, on a fixed zero to 100 percent scale">
      <div class="chart-top"><span><i class="legend-cpu"></i>CPU <i class="legend-ram"></i>RAM</span><span>0–100%</span></div>
      <svg viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true"><path class="grid" d="M2 2H298 M2 30H298 M2 58H298"/><path id="cpu-history"/><path id="ram-history"/></svg>
      <figcaption><span>−90s</span><span id="resource-state">Whole-host observations</span></figcaption>
    </figure>
    <div id="mac-memory" class="mac-memory" hidden>
      <dl class="native-values"><div><dt>Wired</dt><dd id="wired">—</dd></div><div><dt>Compressed</dt><dd id="compressed">—</dd></div><div><dt>Swap used</dt><dd id="swap">—</dd></div></dl>
      <p id="native-freshness" class="native-note">Native readings · every 10s</p>
    </div>
    <p class="machine-explanation">Whole host, not oMLX alone. Non-free RAM includes reclaimable pages; it is not Activity Monitor’s Memory Used.</p>
  </section>
  <section id="session-stats" class="session" aria-labelledby="session-title"><div class="section-heading"><h2 id="session-title">Server session</h2><span id="uptime">Since start / reset</span></div><div class="session-values"><div><span>Decode average</span><strong id="average-decode">—</strong></div><div><span>Prefill average</span><strong id="average-prefill">—</strong></div><div><span>Cache efficiency</span><strong id="average-cache">—</strong></div></div><p id="session-stats-state" class="native-note">Completed requests across all models</p></section>
  <details class="details"><summary>Runtime details<span aria-hidden="true">+</span></summary><dl>
    <div><dt>oMLX process footprint</dt><dd id="process-memory">—</dd></div>
    <div><dt>Model allocation</dt><dd id="model-memory">—</dd></div>
    <div><dt>Prefix cache · RAM</dt><dd id="cache-memory">—</dd></div>
    <div><dt>Prefix cache · SSD</dt><dd id="ssd-cache">—</dd></div>
    <div><dt>Runtime memory guard</dt><dd id="pressure">—</dd></div>
    <div><dt>Output tokens</dt><dd id="output">—</dd></div>
    <div><dt>Request elapsed</dt><dd id="elapsed">—</dd></div>
    <div><dt>Last cache lookup</dt><dd id="cache-lookup">—</dd></div>
  </dl><p class="explanation">Throughput is the active request’s reported average—not instantaneous speed. Session averages cover completed work across models. Runtime memory guard is not macOS memory pressure. Memory uses GiB (1,024³ bytes). Compressed is physical compressor storage. Missing measurements stay unavailable.</p></details>
  </aside></div>
  <footer><span>Independent oMLX monitor</span><span id="freshness">Waiting for first sample</span></footer>
</main>`;

const nodes = new Map<string, HTMLElement>();
root.querySelectorAll<HTMLElement>('[id]').forEach((node) => nodes.set(node.id, node));
const node = (id: string): HTMLElement => nodes.get(id)!;
const text = (id: string, value: string): void => { const target = node(id); if (target.textContent !== value) target.textContent = value; };
const hidden = (id: string, value: boolean): void => { node(id).hidden = value; };
const meter = (id: string, value: number | null): void => { node(id).style.width = `${value === null ? 0 : Math.min(100, Math.max(0, value))}%`; };
const button = node('refresh') as HTMLButtonElement;
const shell = root.querySelector<HTMLElement>('.scope')!;
const signal = new SignalHistory();
const resources = new ResourceHistory();
const pauseButton = node('pause') as HTMLButtonElement;
let lastSystem: SystemSnapshot | null = null;
let userPaused = false;
let efficient = false;
let freshnessTimer: ReturnType<typeof setTimeout> | null = null;
let latest: TelemetrySnapshot = unavailableTelemetry('runtime_unreachable');
let last: AvailableTelemetry | null = null;
let failures = 0;
let mounted = false;
let disposed = false;
let monitorGeneration = 0;
let manualRefresh = false;
const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const rateNumber = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const count = (value: number | null | undefined): string => value == null ? '—' : compact.format(value);
const rate = (value: number | null | undefined): string => value == null ? '—' : `${rateNumber.format(value)} tok/s`;
const gb = (value: number | null | undefined): string => value == null ? '—' : `${number.format(toGiB(value))} GiB`;
const ratio = (a: number | null | undefined, b: number | null | undefined): number | null => a == null || b == null || b <= 0 ? null : a / b * 100;
const percent = (value: number | null | undefined): string => value == null ? '—' : `${Math.round(value)}%`;
const age = (at: number): string => { const seconds = Math.max(0, Math.floor((Date.now() - at) / 1000)); return seconds < 3 ? 'Updated now' : seconds < 60 ? `Updated ${seconds}s ago` : `Updated ${Math.floor(seconds / 60)}m ago`; };
const phases: Record<TelemetryPhase, string> = { connecting: 'Connecting', reconnecting: 'Reconnecting', offline: 'Offline', notLoaded: 'No model', idle: 'Ready', queued: 'Queued', prefill: 'Reading context', decode: 'Generating', processing: 'Processing', unknown: 'Unavailable' };

const drawSignal = (now: number, live: boolean, phase: TelemetryPhase): void => {
  signal.prune(now);
  const tracePhase = phase === 'prefill' ? 'prefill' : phase === 'decode' ? 'decode' : signal.points.at(-1)?.phase ?? 'decode';
  const points = signal.points.filter((point) => point.phase === tracePhase);
  const geometry = traceGeometry(points, now);
  const group = document.getElementById('trace')!;
  // Reuse path elements when the segment count is unchanged.
  while (group.childElementCount > geometry.paths.length) group.lastElementChild!.remove();
  geometry.paths.forEach((path, index) => {
    let target = group.children[index];
    if (!target) {
      target = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      group.append(target);
    }
    target.setAttribute('d', path);
  });
  const cursor = document.getElementById('cursor')!;
  if (geometry.latest) {
    cursor.removeAttribute('hidden');
    cursor.setAttribute('cx', String(geometry.latest.x)); cursor.setAttribute('cy', String(geometry.latest.y));
  } else cursor.setAttribute('hidden', '');
  hidden('chart-empty', points.length > 0);
  text('chart-title', tracePhase === 'prefill' ? 'Prompt reading · reported average' : 'Generation · request average');
  text('ceiling', `${count(geometry.upper)} tok/s`);
  text('chart-state', points.length ? live ? 'Live observations' : 'Recent observations · not live' : 'Observed samples only');
  node('signal').dataset.live = String(live);
  node('signal').setAttribute('aria-label', points.length ? `${tracePhase} throughput over 90 seconds. ${points.length} observations. Latest ${rate(points.at(-1)?.rate)}. Gaps are not zero.` : 'No observed throughput in the last 90 seconds.');
};

const update = (snapshot: TelemetrySnapshot): void => {
  latest = snapshot;
  const current = snapshot.available ? snapshot : null;
  if (current) last = current;
  const phase = current?.phase ?? (last ? 'reconnecting' : snapshot.reason === 'authentication_failed' ? 'offline' : 'connecting');
  const display = current ?? last;
  const stale = current === null;
  const liveRate = current?.phase === 'decode' ? current.liveDecodeTPS : current?.phase === 'prefill' ? current.livePrefillTPS : null;
  shell.dataset.phase = phase;
  shell.dataset.stale = String(stale);
  text('connection', current ? current.phase === 'notLoaded' ? 'oMLX connected · no model loaded' : 'oMLX connected' : snapshot.reason === 'authentication_failed' ? 'Authentication required' : 'Waiting for oMLX');
  text('phase', phases[phase]);
  text('model', display?.modelID?.split('/').at(-1) ?? 'Your local model');
  node('model').title = display?.modelID ?? 'Load a model in oMLX to begin monitoring.';
  text('rate', liveRate !== null ? rateNumber.format(liveRate) : phase === 'idle' ? 'Ready' : phase === 'notLoaded' ? 'Standby' : '—');
  node('rate').classList.toggle('is-word', liveRate === null);
  text('unit', liveRate !== null ? 'tokens / second' : phase === 'idle' ? 'Waiting for your next request' : phase === 'notLoaded' ? 'Load a model in oMLX' : 'No fresh throughput');
  text('activity', stale ? snapshot.message ?? 'Start oMLX on this host, then refresh.' : current.message ?? (phase === 'idle' ? 'Model resident. Nothing running.' : phase === 'notLoaded' ? 'Server is healthy. No model is resident.' : `${count(current.activeRequests)} active · ${current.queuedRequests === null ? 'queue not reported' : current.queuedRequests ? `${current.queuedRequests} queued` : 'queue clear'}`));
  text('notice', stale ? last ? `${age(last.sampledAt)}. Retained details are not live.` : 'Read-only connection · check your local oMLX endpoint and credential.' : '');
  hidden('notice', !stale);
  const progress = current?.phase === 'prefill' ? current.prefillProgress : null;
  hidden('prefill-track', progress == null);
  if (progress != null) {
    node('prefill-track').setAttribute('aria-valuenow', String(Math.round(Math.min(1, progress) * 100)));
    (node('prefill-track').firstElementChild as HTMLElement).style.width = `${Math.min(1, progress) * 100}%`;
  }
  const contextPercent = ratio(current?.promptTokens, current?.contextWindow);
  const reusedPercent = ratio(current?.cachedTokens, current?.promptTokens);
  text('context', percent(contextPercent)); text('context-detail', current?.promptTokens == null ? 'Not reported' : `${count(current.promptTokens)} / ${count(current.contextWindow)}`);
  text('reuse', percent(reusedPercent)); text('reuse-detail', current?.cachedTokens == null ? 'Not reported' : `${count(current.cachedTokens)} tokens`);
  meter('context-bar', contextPercent); meter('reuse-bar', reusedPercent);
  text('requests', count(current?.activeRequests)); text('queue', current ? current.queuedRequests === null ? 'Queue not reported' : current.queuedRequests ? `${current.queuedRequests} queued` : 'Queue clear' : 'No live reading');
  text('average-decode', rate(display?.sessionAverageDecodeTPS)); text('average-prefill', rate(display?.sessionAveragePrefillTPS)); text('average-cache', percent(display?.sessionCacheEfficiencyPercent));
  const statsState = stale ? 'stale' : current?.sessionStatsState ?? 'unavailable';
  node('session-stats').dataset.stale = String(statsState !== 'fresh');
  text('session-stats-state', statsState === 'fresh' ? 'Completed requests across all models' : statsState === 'stale' ? 'Last available totals · not live' : 'Session statistics unavailable');
  const uptime = display?.lifetime?.uptimeSeconds;
  text('uptime', uptime == null ? 'Since start / reset' : `${Math.floor(uptime / 3600)}h ${Math.floor(uptime % 3600 / 60)}m · since start`);
  text('process-memory', gb(display?.memory?.activeGB)); text('model-memory', gb(display?.memory?.modelGB)); text('cache-memory', gb(display?.memory?.cacheGB)); text('ssd-cache', gb(display?.sessionBank?.cold?.totalGB));
  text('pressure', display?.memoryPressureLevel == null ? 'Not reported' : ['Not reported', 'Normal', 'Elevated', 'Critical'][Math.min(3, display.memoryPressureLevel)] ?? 'Not reported');
  text('output', count(current?.completionTokens)); text('elapsed', current?.elapsedSeconds == null ? '—' : `${number.format(current.elapsedSeconds)}s`); text('cache-lookup', display?.sessionBank?.lastMissReason?.replaceAll('_', ' ') ?? 'Not reported');
  text('freshness', display ? age(display.sampledAt) : 'No sample yet');
  if (snapshot.system) lastSystem = snapshot.system;
  const system = snapshot.system ?? lastSystem;
  hidden('machine', system === null);
  node('machine').dataset.stale = String(snapshot.system === null);
  if (system) {
    text('machine-title', system.platform === 'macOS' ? 'macOS host' : `${system.platform} resources`);
    text('hardware', [system.cpuModel, system.logicalCores ? `${system.logicalCores} logical cores` : null].filter(Boolean).join(' · '));
    text('machine-freshness', snapshot.system ? age(system.sampledAt) : 'Last reading · not live');
    text('cpu', percent(snapshot.system?.cpuPercent)); meter('cpu-bar', snapshot.system?.cpuPercent ?? null);
    text('ram', `${system.memoryUsedGB == null ? '—' : number.format(toGiB(system.memoryUsedGB))} / ${gb(system.memoryTotalGB)}`);
    meter('ram-bar', ratio(system.memoryUsedGB, system.memoryTotalGB));
    hidden('mac-memory', system.platform !== 'macOS');
    const native = system.macOS;
    const nativeFresh = snapshot.system !== null && native !== null && Date.now() - native.sampledAt <= 20_000;
    text('wired', gb(nativeFresh ? native.wiredGB : null)); text('compressed', gb(nativeFresh ? native.compressedGB : null)); text('swap', gb(nativeFresh ? native.swapUsedGB : null));
    text('native-freshness', native ? `${age(native.sampledAt)} · native readings up to every 10s` : 'Native diagnostics unavailable on this host');
  }
  resources.observe(snapshot.system);
  document.getElementById('cpu-history')!.setAttribute('d', resources.paths('cpu', Date.now()));
  document.getElementById('ram-history')!.setAttribute('d', resources.paths('memory', Date.now()));
  text('resource-state', snapshot.system ? 'Whole-host observations' : 'Recent observations · not live');
  signal.observe(snapshot);
  drawSignal(Date.now(), liveRate !== null && !stale, phase);
};

const poller = new Poller(async () => {
  const generation = monitorGeneration;
  try {
    const response = await host.serviceRequest({ method: 'GET', path: '/snapshot' });
    const parsed = response.status === 200 ? parseTelemetrySnapshot(JSON.parse(response.body)) : unavailableForServiceResponse(response.status);
    failures = parsed.available ? 0 : failures + 1;
    if (!disposed && generation === monitorGeneration && !userPaused && !document.hidden) { update(parsed); armFreshness(); }
  } catch (error) {
    failures += 1;
    if (!disposed && generation === monitorGeneration && !userPaused && !document.hidden) update(unavailableForHostError(error));
  } finally {
    if (manualRefresh) { button.disabled = userPaused; button.removeAttribute('aria-busy'); manualRefresh = false; }
  }
  // Keep host readings useful when oMLX is offline; the client has its own retry budget.
  const delay = latest.system ? Math.min(2_000, nextDelay(last, failures)) : nextDelay(last, failures);
  return efficient ? Math.max(3_000, delay) : delay;
});

const clearFreshness = (): void => { if (freshnessTimer !== null) clearTimeout(freshnessTimer); freshnessTimer = null; };
const armFreshness = (): void => {
  clearFreshness();
  if (disposed || userPaused || document.hidden) return;
  // One deadline, not an animation loop. Stalled SDK requests cannot leave a live rate on screen.
  freshnessTimer = setTimeout(() => {
    freshnessTimer = null;
    update(unavailableTelemetry('runtime_unreachable', 'No fresh observations. Retained readings are not live.'));
  }, efficient ? 10_000 : 6_000);
};
const syncMonitoring = (): void => {
  monitorGeneration += 1;
  poller.setPaused(userPaused || document.hidden);
  if (userPaused || document.hidden) {
    clearFreshness(); resources.break(); signal.break();
  } else armFreshness();
};
pauseButton.addEventListener('click', () => {
  userPaused = !userPaused;
  shell.dataset.paused = String(userPaused);
  pauseButton.setAttribute('aria-pressed', String(userPaused));
  pauseButton.title = userPaused ? 'Resume monitoring' : 'Pause this monitor, not inference';
  text('pause-label', userPaused ? 'Resume' : 'Pause');
  document.getElementById('pause-symbol')!.setAttribute('d', userPaused ? 'M7 4l8 6-8 6z' : 'M7 5v10M13 5v10');
  button.disabled = userPaused || manualRefresh;
  text('connection', userPaused ? 'Monitoring paused' : 'Resuming monitoring');
  text('phase', userPaused ? 'Paused' : 'Refreshing');
  text('unit', userPaused ? 'Frozen observation' : 'Waiting for a fresh observation');
  if (!userPaused) text('rate', '—');
  text('notice', userPaused ? 'Only this monitor is paused. Your model keeps running; these readings are frozen.' : 'Resuming live observations…');
  hidden('notice', false);
  text('chart-end', userPaused ? 'paused' : 'now');
  text('resource-state', userPaused ? 'Frozen observations' : 'Waiting for fresh observations');
  text('machine-freshness', userPaused ? 'Frozen reading' : 'Refreshing');
  text('freshness', userPaused ? 'Monitoring paused' : 'Refreshing');
  drawSignal(Date.now(), false, latest.phase);
  syncMonitoring();
});

document.getElementById('efficiency')!.addEventListener('click', (event) => {
  efficient = !efficient;
  (event.currentTarget as HTMLButtonElement).setAttribute('aria-pressed', String(efficient));
  shell.dataset.efficient = String(efficient);
  armFreshness();
});

button.addEventListener('click', () => {
  manualRefresh = true;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  void poller.refresh();
});
host.onReady((ready) => {
  applyHostReady(ready, document.documentElement);
  document.documentElement.style.colorScheme = ready.theme.mode;
  shell.dataset.surface = ready.surface;
  if (mounted) return;
  mounted = true;
  syncMonitoring();
  poller.start();
});
document.addEventListener('visibilitychange', syncMonitoring);
window.addEventListener('pagehide', (event) => { poller.stop(); clearFreshness(); resources.break(); signal.break(); monitorGeneration += 1; if (!event.persisted) { disposed = true; host.dispose(); } });
window.addEventListener('pageshow', (event) => { if (event.persisted && mounted) { syncMonitoring(); poller.start(); } });
