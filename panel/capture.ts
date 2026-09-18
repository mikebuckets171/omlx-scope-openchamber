import type { TelemetrySnapshot } from '../src/telemetry.ts';

export type Capture = {
  model: string; targetSeconds: 30 | 60; startedAt: number; lastAt: number;
  seconds: number; samples: number; decodeSeconds: number; decodeTokens: number;
  peakProcessGB: number | null; peakCPU: number | null; startSwapGB: number | null;
  lastSwapGB: number | null; status: 'recording' | 'finished' | 'interrupted'; note: string;
};
type Counter = { epoch: number; tokens: number; at: number };
const count = (n: number | null): n is number => n !== null && Number.isSafeInteger(n) && n >= 0;
const safe = (n: number | null | undefined): n is number => n != null && Number.isFinite(n) && n >= 0;
export const capturedRate = (capture: Capture | null): number | null => capture && capture.decodeSeconds >= 2 ? capture.decodeTokens / capture.decodeSeconds : null;

/** Explicit, bounded observation window. Two summaries + one counter, not a request log.
 * Uses the monitor's existing observations; no timer, inference, disk write or network call.
 */
export class PerformanceCapture {
  current: Capture | null = null;
  baseline: Capture | null = null;
  private previous: Counter | null = null;
  private started = 0;
  private lastClock = 0;
  constructor(private readonly clock: () => number = () => performance.now()) {}
  get recording(): boolean { return this.current?.status === 'recording'; }

  start(snapshot: TelemetrySnapshot, targetSeconds: 30 | 60): boolean {
    if (this.recording || !snapshot.available || !snapshot.modelID || snapshot.activeRequests !== 1
      || !['decode', 'prefill', 'processing'].includes(snapshot.phase)) return false;
    this.started = this.lastClock = this.clock();
    this.current = { model: snapshot.modelID, targetSeconds, startedAt: snapshot.sampledAt,
      lastAt: snapshot.sampledAt - 1, seconds: 0, samples: 0, decodeSeconds: 0, decodeTokens: 0,
      peakProcessGB: null, peakCPU: null, startSwapGB: null, lastSwapGB: null,
      status: 'recording', note: 'Observing this model. No extra inference is started.' };
    this.previous = null;
    this.observe(snapshot);
    return true;
  }
  observe(snapshot: TelemetrySnapshot): void {
    const c = this.current;
    if (!c || !this.recording) return;
    const now = this.clock();
    if (now < this.lastClock || now - this.lastClock > 12_000) { this.stop('Monitoring gap'); return; }
    this.lastClock = now;
    if (!snapshot.available) { this.stop('Runtime unavailable'); return; }
    if (snapshot.modelID !== c.model || (snapshot.activeRequests ?? 0) > 1) { this.stop('Model or workload changed'); return; }
    if (snapshot.sampledAt < c.lastAt) { this.stop('Observation clock changed'); return; }
    if (snapshot.sampledAt === c.lastAt) return;
    if (c.samples && snapshot.sampledAt - c.lastAt > 12_000) { this.stop('Monitoring gap'); return; }
    c.seconds = Math.max(0, (now - this.started) / 1000);
    c.lastAt = snapshot.sampledAt; c.samples = Math.min(1000, c.samples + 1);
    if (safe(snapshot.memory?.activeGB)) c.peakProcessGB = Math.max(c.peakProcessGB ?? 0, snapshot.memory.activeGB);
    if (safe(snapshot.system?.cpuPercent)) c.peakCPU = Math.max(c.peakCPU ?? 0, snapshot.system.cpuPercent);
    const swap = snapshot.system?.macOS?.swapUsedGB;
    if (safe(swap)) { c.startSwapGB ??= swap; c.lastSwapGB = swap; }
    const n = snapshot.completionTokens;
    if (snapshot.phase === 'decode' && snapshot.activeRequests === 1 && count(n) && snapshot.traceEpoch !== null) {
      const p = this.previous;
      if (p && p.epoch === snapshot.traceEpoch && n >= p.tokens && snapshot.sampledAt > p.at) {
        const elapsed = (snapshot.sampledAt - p.at) / 1000;
        if (elapsed <= 12) {
          const sum = c.decodeTokens + n - p.tokens;
          if (!Number.isSafeInteger(sum)) { this.stop('Token counter exceeded safe range'); return; }
          c.decodeTokens = sum; c.decodeSeconds += elapsed;
        }
      }
      this.previous = { epoch: snapshot.traceEpoch, tokens: n, at: snapshot.sampledAt };
    } else this.previous = null;
    if (c.seconds >= c.targetSeconds || c.samples >= 1000) {
      c.status = 'finished'; c.note = 'Observation window ended. Not a controlled benchmark.';
      this.previous = null;
    }
  }
  stop(reason = 'Stopped by you'): void {
    if (!this.current || !this.recording) return;
    this.current.status = 'interrupted'; this.current.note = reason + ' · partial observation'; this.previous = null;
  }
  pin(): boolean {
    if (!this.current || this.recording || capturedRate(this.current) === null) return false;
    this.baseline = { ...this.current }; return true;
  }
  clear(): void { this.current = null; this.baseline = null; this.previous = null; }
  comparison(): number | null {
    const current = this.current, baseline = this.baseline;
    const a = capturedRate(current), b = capturedRate(baseline);
    if (!current || !baseline || this.recording || current.startedAt === baseline.startedAt
      || current.model !== baseline.model || current.decodeSeconds < 5 || baseline.decodeSeconds < 5
      || a === null || b === null || b <= 0) return null;
    return (a / b - 1) * 100;
  }
  report(version: string): string {
    const lines = [`OMLX Scope ${version} — performance observations`,
      'Server-wide observations, not selected-chat attribution or a controlled benchmark. Only measured generation intervals contribute to speed. Different workloads are not directly comparable.'];
    const print = (label: string, c: Capture) => {
      const rate = capturedRate(c);
      lines.push(`${label}: ${c.status}, ${c.seconds.toFixed(1)}s, ${c.samples} samples; ${c.note}`,
        `Observed generation: ${rate === null ? 'not enough data' : rate.toFixed(1) + ' tok/s'} across ${c.decodeSeconds.toFixed(1)}s; ${c.decodeTokens} observed token increments.`,
        `Peak observed oMLX process: ${c.peakProcessGB === null ? 'not reported' : (c.peakProcessGB * 1e9 / 1024 ** 3).toFixed(2) + ' GiB'}; peak host CPU: ${c.peakCPU === null ? 'not reported' : c.peakCPU.toFixed(1) + '%'}.`);
    };
    if (this.current) print('Current capture', this.current);
    if (this.baseline) print('Pinned reference', this.baseline);
    return lines.join('\n'); // No model names, session names, IDs, raw messages or paths.
  }
}
