import type { TelemetrySnapshot } from '../src/telemetry.ts';
import { PerformanceCapture, capturedRate } from './capture.ts';

export const captureMarkup = `<section id="capture" class="capture-card" aria-labelledby="capture-title">
  <div class="section-heading"><h2 id="capture-title">Performance capture</h2><span id="capture-state">On demand</span></div>
  <p class="insight-note">Observe a workload. Pin a reference. Compare your next run.</p>
  <div class="capture-controls"><select id="capture-length" aria-label="Observation length"><option value="30">30 seconds</option><option value="60">60 seconds</option></select><button id="capture-start" type="button">Record window</button><button id="capture-stop" type="button" hidden>Stop</button></div>
  <div id="capture-progress" class="progress-track" role="progressbar" aria-label="Observation window" aria-valuemin="0" aria-valuemax="100" hidden><span></span></div>
  <div id="capture-results" hidden>
    <div class="capture-metrics"><div><span>Observed generation</span><strong id="capture-speed">—</strong><small id="capture-coverage">Waiting for output</small></div><div><span>Peak oMLX footprint</span><strong id="capture-memory">—</strong><small id="capture-cpu">Host CPU not reported</small></div></div>
    <p id="capture-note" class="insight-note"></p>
    <div id="capture-baseline" class="capture-baseline" hidden><span id="capture-reference">Pinned reference</span><strong id="capture-change">—</strong></div>
    <div class="insight-actions"><button id="capture-pin" type="button">Pin reference</button><button id="capture-copy" type="button">Copy capture</button><button id="capture-clear" type="button">Clear</button></div>
  </div>
  <p class="insight-note">No test prompts are sent. Captures use existing samples, stay in memory, and are not controlled benchmarks.</p>
</section>`;

export class CaptureView {
  readonly capture = new PerformanceCapture();
  private latest: TelemetrySnapshot | null = null;
  private paused = false;
  constructor(private readonly root: HTMLElement, private readonly copied: (text: string) => Promise<void>, private readonly status: (message: string) => void, private readonly version: string) {
    this.node('capture-start').addEventListener('click', () => {
      const length = (this.node('capture-length') as HTMLSelectElement).value === '60' ? 60 : 30;
      if (this.paused || !this.latest || !this.capture.start(this.latest, length)) {
        this.status('Start a single-model request in oMLX, then record its observations.'); return;
      }
      this.status('Recording observations only. No prompt or model setting was changed.'); this.render();
    });
    this.node('capture-stop').addEventListener('click', () => { this.capture.stop(); this.render(); });
    this.node('capture-pin').addEventListener('click', () => { this.capture.pin(); this.render(); });
    this.node('capture-clear').addEventListener('click', () => { this.capture.clear(); this.render(); });
    this.node('capture-copy').addEventListener('click', async () => {
      const button = this.node('capture-copy') as HTMLButtonElement; button.disabled = true;
      try { await this.copied(this.capture.report(this.version)); this.status('Capture copied. No model names or chat content included.'); }
      catch { this.status('Could not confirm the clipboard operation.'); }
      finally { button.disabled = false; }
    });
  }
  private node(id: string): HTMLElement { return this.root.querySelector<HTMLElement>(`#${id}`)!; }
  private text(id: string, value: string): void { const node = this.node(id); if (node.textContent !== value) node.textContent = value; }
  update(snapshot: TelemetrySnapshot): void { this.latest = snapshot; this.paused = false; this.capture.observe(snapshot); this.render(); }
  suspend(): void { this.paused = true; this.capture.stop('Monitoring interrupted'); this.render(); }
  report(): string { return this.capture.current ? this.capture.report(this.version) : ''; }
  private render(): void {
    const c = this.capture.current, b = this.capture.baseline;
    const recording = this.capture.recording;
    this.node('capture').dataset.recording = String(recording);
    this.node('capture-stop').hidden = !recording;
    (this.node('capture-start') as HTMLButtonElement).disabled = this.paused || recording;
    (this.node('capture-length') as HTMLSelectElement).disabled = recording;
    this.node('capture-progress').hidden = !recording;
    this.node('capture-results').hidden = c === null;
    this.text('capture-state', c ? recording ? `${Math.floor(c.seconds)} / ${c.targetSeconds}s` : c.status === 'finished' ? 'Captured' : 'Partial capture' : 'On demand');
    if (!c) return;
    const percent = Math.min(100, c.seconds / c.targetSeconds * 100);
    this.node('capture-progress').setAttribute('aria-valuenow', String(Math.floor(percent)));
    (this.node('capture-progress').firstElementChild as HTMLElement).style.width = `${percent}%`;
    const r = capturedRate(c), ref = capturedRate(b);
    this.text('capture-speed', r === null ? '—' : `${r.toFixed(1)} tok/s`);
    this.text('capture-coverage', `${c.decodeSeconds.toFixed(1)}s of generation observed`);
    this.text('capture-memory', c.peakProcessGB === null ? '—' : `${(c.peakProcessGB * 1e9 / 1024 ** 3).toFixed(1)} GiB`);
    this.text('capture-cpu', c.peakCPU === null ? 'Host CPU not reported' : `${c.peakCPU.toFixed(0)}% peak host CPU`);
    this.text('capture-note', c.note);
    (this.node('capture-pin') as HTMLButtonElement).disabled = recording || r === null;
    this.node('capture-baseline').hidden = b === null;
    this.text('capture-reference', ref === null ? 'Pinned reference' : `Reference · ${ref.toFixed(1)} tok/s over ${b!.decodeSeconds.toFixed(1)}s`);
    const change = this.capture.comparison();
    this.text('capture-change', change === null ? b?.model !== c.model ? 'Different model' : 'Collect another window' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}% observed`);
  }
}
