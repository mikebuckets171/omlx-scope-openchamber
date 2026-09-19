import type { HostClient } from '@openchamber/sdk';
import type { TelemetrySnapshot } from '../src/telemetry.ts';
import { PerformanceCapture, capturedRate } from './capture.ts';
import { ReplyCapture } from './reply-capture.ts';

export const captureMarkup = `<section id="capture" class="capture-card" aria-labelledby="capture-title">
  <div class="section-heading"><h2 id="capture-title">Performance capture</h2><span id="capture-state">On demand</span></div>
  <p class="insight-note">Record a window. Pin it. Compare a similar run.</p>
  <div class="capture-controls"><select id="capture-length" aria-label="Observation length"><option value="30">30 seconds</option><option value="60">60 seconds</option><option value="reply">Next reply</option></select><button id="capture-start" type="button">Record window</button><button id="capture-stop" type="button" hidden>Stop</button></div>
  <p id="capture-reply-state" class="capture-reply-state" role="status" hidden></p>
  <div id="capture-progress" class="progress-track" role="progressbar" aria-label="Observation window" aria-valuemin="0" aria-valuemax="100" hidden><span></span></div>
  <div id="capture-results" hidden>
    <div class="capture-metrics"><div><span>Observed generation</span><strong id="capture-speed">—</strong><small id="capture-coverage">Waiting for output</small></div><div><span>Peak oMLX memory</span><strong id="capture-memory">—</strong><small id="capture-cpu">Host CPU not reported</small></div></div>
    <p id="capture-note" class="insight-note"></p>
    <div id="capture-baseline" class="capture-baseline" hidden><span id="capture-reference">Pinned reference</span><strong id="capture-change">—</strong></div>
    <div class="insight-actions"><button id="capture-pin" type="button">Pin reference</button><button id="capture-copy" type="button">Copy capture</button><button id="capture-clear" type="button">Clear</button></div>
  </div>
  <details class="reading-help"><summary>How captures work<span aria-hidden="true">+</span></summary><p>Captures use existing readings. They send no prompts and stay in memory. Compare similar workloads, not different tasks.</p><p><b>Next reply</b> waits for the selected chat to start, then stops when it goes idle. Keep this view open. Readings cover all oMLX requests, not just that chat. Changing chats, pausing, or losing the connection stops the capture. Waiting is limited to two minutes; recording to ten minutes.</p><p><b>Turn Stats</b> belongs to OpenChamber. It reports the completed turn’s timing and tokens. OMLX Scope cannot read or add rows to it through the current extension API. Use it alongside these live runtime observations; the speeds measure different things.</p></details>
</section>`;

export class CaptureView {
  readonly capture = new PerformanceCapture();
  readonly reply = new ReplyCapture(this.capture);
  private latest: TelemetrySnapshot | null = null;
  private paused = false;
  private disposed = false;
  private copyPending = false;
  private readonly unsubscribe: () => void;
  constructor(private readonly root: HTMLElement, private readonly copied: (text: string) => Promise<void>, private readonly status: (message: string) => void, private readonly version: string, host: Pick<HostClient, 'onSession'>) {
    this.unsubscribe = host.onSession(session => { this.reply.setSession(session); this.render(); });
    this.node('capture-length').addEventListener('change', () => this.render());
    this.node('capture-start').addEventListener('click', () => {
      if (this.nextReply) {
        if (this.paused || !this.reply.arm()) this.status('Select an idle chat first, then arm Next reply. Nothing is sent for you.');
      } else {
        const length = (this.node('capture-length') as HTMLSelectElement).value === '60' ? 60 : 30;
        if (this.paused || !this.latest || !this.capture.start(this.latest, length)) {
          this.status('Start a single-model request in oMLX, then record its observations.'); return;
        }
        this.status('Recording observations only. No prompt or model setting was changed.');
      }
      this.render();
    });
    this.node('capture-stop').addEventListener('click', () => {
      this.reply.cancel(); this.capture.stop();
      this.status('Capture stopped. Any sampled readings are retained.'); this.render();
    });
    this.node('capture-pin').addEventListener('click', () => { if (this.capture.pin()) this.status('Reference pinned. Record another comparable workload to compare.'); this.render(); });
    this.node('capture-clear').addEventListener('click', () => {
      this.reply.cancel(); this.reply.message = ''; this.capture.clear();
      this.status('Capture and reference cleared. oMLX statistics were not changed.'); this.render();
    });
    this.node('capture-copy').addEventListener('click', async () => {
      if (this.copyPending) return;
      this.copyPending = true; this.render();
      try { await this.copied(this.capture.report(this.version)); if (!this.disposed) this.status('Capture copied. No model names or chat content included.'); }
      catch { if (!this.disposed) this.status('Could not confirm the clipboard operation.'); }
      finally { this.copyPending = false; this.render(); }
    });
    this.render();
  }
  private get nextReply(): boolean { return (this.node('capture-length') as HTMLSelectElement).value === 'reply'; }
  private node(id: string): HTMLElement { return this.root.querySelector<HTMLElement>(`#${id}`)!; }
  private text(id: string, value: string): void { const node = this.node(id); if (node.textContent !== value) node.textContent = value; }
  update(snapshot: TelemetrySnapshot): void {
    this.latest = snapshot; this.paused = false;
    if (this.reply.active) this.reply.observe(snapshot);
    else { this.reply.observe(snapshot); this.capture.observe(snapshot); }
    this.render();
  }
  suspend(): void {
    this.paused = true; this.reply.cancel('Monitoring interrupted. Arm Next reply again when ready.');
    this.capture.stop('Monitoring interrupted'); this.render();
  }
  dispose(): void { this.suspend(); this.disposed = true; this.unsubscribe(); }
  report(): string { return this.capture.current ? this.capture.report(this.version) : ''; }
  private render(): void {
    if (this.disposed) return;
    const c = this.capture.current, b = this.capture.baseline;
    const recording = this.capture.recording, active = recording || this.reply.active;
    this.node('capture').dataset.recording = String(recording);
    this.node('capture').dataset.active = String(active);
    this.node('capture-stop').hidden = !active;
    this.text('capture-stop', this.reply.state === 'armed' ? 'Cancel' : 'Stop');
    this.text('capture-start', this.nextReply ? 'Arm next reply' : 'Record window');
    (this.node('capture-start') as HTMLButtonElement).disabled = this.paused || active || (this.nextReply && !this.reply.canArm);
    (this.node('capture-length') as HTMLSelectElement).disabled = active;
    this.node('capture-progress').hidden = !recording;
    this.node('capture-results').hidden = c === null;
    this.node('capture-reply-state').hidden = !this.nextReply;
    this.text('capture-reply-state', this.reply.message || 'Select an idle chat, arm capture, then send your message.');
    this.text('capture-state', this.reply.state === 'armed' ? 'Armed' : this.reply.state === 'following' ? 'Following reply' : c ? recording ? `${Math.floor(c.seconds)} / ${c.targetSeconds}s` : c.status === 'finished' ? 'Captured' : 'Partial capture' : 'On demand');
    if (!c) return;
    const percent = Math.min(100, c.seconds / c.targetSeconds * 100);
    this.node('capture-progress').setAttribute('aria-valuenow', String(Math.floor(percent)));
    this.node('capture-progress').setAttribute('aria-label', c.targetSeconds === 600 ? 'Ten-minute capture limit, not reply progress' : 'Observation window');
    (this.node('capture-progress').firstElementChild as HTMLElement).style.width = `${percent}%`;
    const r = capturedRate(c), ref = capturedRate(b);
    this.text('capture-speed', r === null ? '—' : `${r.toFixed(1)} tok/s`);
    this.text('capture-coverage', `${c.decodeSeconds.toFixed(1)}s of generation observed`);
    this.text('capture-memory', c.peakProcessGB === null ? '—' : `${(c.peakProcessGB * 1e9 / 1024 ** 3).toFixed(1)} GiB`);
    this.text('capture-cpu', c.peakCPU === null ? 'Host CPU not reported' : `${c.peakCPU.toFixed(0)}% peak host CPU`);
    this.text('capture-note', c.note);
    (this.node('capture-pin') as HTMLButtonElement).disabled = active || r === null;
    (this.node('capture-copy') as HTMLButtonElement).disabled = this.copyPending;
    this.node('capture-baseline').hidden = b === null;
    this.text('capture-reference', ref === null ? 'Pinned reference' : `Reference · ${ref.toFixed(1)} tok/s over ${b!.decodeSeconds.toFixed(1)}s`);
    const change = this.capture.comparison();
    this.text('capture-change', change === null ? b?.model !== c.model ? 'Different model' : 'Collect another window' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}% observed`);
  }
}
