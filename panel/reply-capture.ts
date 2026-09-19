import type { TelemetrySnapshot } from '../src/telemetry.ts';
import { PerformanceCapture } from './capture.ts';

type Session = { id: string; busy: boolean };
export const REPLY_WAIT_MS = 120_000;
export const REPLY_LIMIT_MS = 600_000;

/** Explicitly armed, view-local timing. Never claims oMLX-to-chat attribution.
 * Session snapshots choose the interval; existing runtime snapshots supply readings.
 * No timers, messages, storage writes, or extra network requests.
 */
export class ReplyCapture {
  state: 'idle' | 'armed' | 'following' = 'idle';
  message = '';
  private session: Session | null = null;
  private expectedID: string | null = null;
  private deadline = 0;
  private lastClock = 0;
  private lastSample = -Infinity;
  private sampleBoundary = -Infinity;
  private hasStarted = false;

  constructor(readonly capture: PerformanceCapture, private readonly clock: () => number = () => performance.now()) {}
  get active(): boolean { return this.state !== 'idle'; }
  get canArm(): boolean { return this.session !== null && !this.session.busy && !this.active && !this.capture.recording; }

  setSession(session: Session | null): void {
    const previous = this.session;
    this.session = session ? { id: session.id, busy: session.busy } : null;
    if (!this.active) return;
    if (!session || session.id !== this.expectedID) { this.cancel('Chat changed. Capture stopped.'); return; }
    if (!this.inTime()) return;
    if (this.state === 'armed' && previous?.id === session.id && !previous.busy && session.busy) {
      this.state = 'following';
      this.deadline = this.clock() + REPLY_LIMIT_MS;
      this.sampleBoundary = this.lastSample;
      this.message = 'Chat running · waiting for fresh oMLX activity';
    } else if (this.state === 'following' && !session.busy) {
      if (this.capture.recording) this.capture.finish('Chat is idle. Server-wide observations, not a completed-turn result.');
      this.state = 'idle'; this.expectedID = null;
      this.message = this.hasStarted ? 'Chat is idle · capture ready' : 'No oMLX activity was sampled while the chat ran.';
    }
  }

  arm(): boolean {
    if (!this.canArm) return false;
    this.expectedID = this.session!.id;
    this.state = 'armed'; this.hasStarted = false;
    this.lastClock = this.clock(); this.deadline = this.lastClock + REPLY_WAIT_MS;
    this.capture.clearCurrent();
    this.message = 'Waiting for your next reply · keep this view open';
    return true;
  }

  observe(snapshot: TelemetrySnapshot): void {
    this.lastSample = Math.max(this.lastSample, snapshot.sampledAt);
    if (!this.active || !this.inTime() || this.state !== 'following') return;
    if (!snapshot.available) { this.cancel('oMLX is unavailable. Capture stopped.'); return; }
    if (!this.hasStarted) {
      if (snapshot.sampledAt <= this.sampleBoundary) return;
      if ((snapshot.activeRequests ?? 0) > 1) { this.cancel('More than one request is running. Capture cancelled.'); return; }
      if (!this.capture.start(snapshot, 600)) return;
      this.hasStarted = true;
      this.message = 'Recording while the chat runs · all oMLX requests';
    } else {
      this.capture.observe(snapshot);
      if (!this.capture.recording) {
        this.state = 'idle'; this.expectedID = null;
        this.message = this.capture.current?.note ?? 'Capture stopped.';
      }
    }
  }

  cancel(reason = 'Capture cancelled.'): void {
    if (this.active && this.capture.recording) this.capture.stop(reason);
    if (this.active) this.message = reason;
    this.state = 'idle'; this.expectedID = null;
  }

  private inTime(): boolean {
    const now = this.clock();
    if (now < this.lastClock) { this.cancel('Clock changed. Capture stopped.'); return false; }
    this.lastClock = now;
    if (now >= this.deadline) {
      this.cancel(this.state === 'armed' ? 'No reply started within two minutes. Arm it again when ready.' : 'Ten-minute limit reached. Readings are retained.');
      return false;
    }
    return true;
  }
}
