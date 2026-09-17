/** One request and one timer at most. Hidden panels do no polling work. */
export class Poller {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: Promise<void> | null = null;
  private stopped = true;
  private paused = false;

  constructor(private readonly run: () => Promise<number>) {}

  start(): void { this.stopped = false; void this.refresh(); }
  stop(): void { this.stopped = true; this.clear(); }
  setPaused(paused: boolean): void {
    this.paused = paused;
    this.clear();
    if (!paused && !this.stopped) void this.refresh();
  }
  refresh(): Promise<void> {
    this.clear();
    if (this.pending) return this.pending;
    if (this.stopped || this.paused) return Promise.resolve();
    this.pending = this.run().catch(() => 5_000).then((delay) => {
      if (!this.stopped && !this.paused) this.timer = setTimeout(() => { this.timer = null; void this.refresh(); }, delay);
    }).finally(() => { this.pending = null; });
    return this.pending;
  }
  private clear(): void { if (this.timer !== null) clearTimeout(this.timer); this.timer = null; }
}
