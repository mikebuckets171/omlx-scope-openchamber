import { expect, test } from 'bun:test';
import { cpuUsage, SystemSampler } from './system.ts';
import { parseSystemSnapshot } from '../src/system.ts';

test('CPU uses differences across all cores, not cumulative uptime', () => {
  expect(cpuUsage(null, { idle: 80, total: 100 })).toBeNull();
  expect(cpuUsage({ idle: 80, total: 100 }, { idle: 150, total: 200 })).toBeCloseTo(30);
  expect(cpuUsage({ idle: 80, total: 100 }, { idle: 80, total: 100 })).toBeNull();
  expect(cpuUsage({ idle: 80, total: 100 }, { idle: 1, total: 2 })).toBeNull();
});

test('system sampling is cached and validates the browser boundary', () => {
  const sampler = new SystemSampler();
  const first = sampler.sample(10_000);
  expect(sampler.sample(11_000)).toBe(first);
  expect(sampler.sample(12_000)).not.toBe(first);
  expect(first.cpuPercent).toBeNull();
  expect(first.memoryUsedGB).toBeLessThanOrEqual(first.memoryTotalGB!);
  expect(parseSystemSnapshot({ ...first, cpuPercent: Infinity })?.cpuPercent).toBeNull();
  expect(parseSystemSnapshot(null)).toBeNull();
});
