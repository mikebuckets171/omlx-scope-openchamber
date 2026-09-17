import { cpus, freemem, totalmem, platform } from 'node:os';
import type { SystemSnapshot } from '../src/system.ts';

export type CPUTicks = { idle: number; total: number };
export const cpuUsage = (previous: CPUTicks | null, current: CPUTicks): number | null => {
  if (previous === null) return null;
  const total = current.total - previous.total;
  const idle = current.idle - previous.idle;
  if (total <= 0 || idle < 0 || idle > total) return null;
  return Math.max(0, Math.min(100, (1 - idle / total) * 100));
};

/** No subprocesses, privileged helpers, sensors, or background timers. */
export class SystemSampler {
  private previous: CPUTicks | null = null;
  private cached: SystemSnapshot | null = null;

  sample(now = Date.now()): SystemSnapshot {
    if (this.cached && now - this.cached.sampledAt < 2_000) return this.cached;
    const ticks = cpus().reduce((result, cpu) => ({
      idle: result.idle + cpu.times.idle,
      total: result.total + Object.values(cpu.times).reduce((sum, time) => sum + time, 0),
    }), { idle: 0, total: 0 });
    const total = totalmem();
    this.cached = {
      platform: platform(),
      cpuPercent: cpuUsage(this.previous, ticks),
      // Physical minus OS-reported free memory includes reclaimable pages.
      // Deliberately not labelled Activity Monitor's Memory Used or pressure.
      memoryUsedGB: Math.max(0, total - freemem()) / 1e9,
      memoryTotalGB: total / 1e9,
      sampledAt: now,
    };
    this.previous = ticks;
    return this.cached;
  }
}
