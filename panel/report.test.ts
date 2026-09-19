import { expect, test } from 'bun:test';
import { measurementReport } from './report.ts';
import { parseTelemetrySnapshot, unavailableTelemetry } from '../src/telemetry.ts';

test('clipboard report contains measurements, never raw messages, keys, model names or IDs', () => {
  const reading = parseTelemetrySnapshot({ available: true, phase: 'prefill', prefillProgress: 0.64, prefillProcessedTokens: 64, prefillTotalTokens: 100,
    modelID: 'secret-model', message: '/Users/private secret-key', traceEpoch: 12345, sampledAt: 1000 });
  const report = measurementReport(reading, null, false, '0.5.3', 2000);
  expect(report).toContain('36% remaining'); expect(report).toContain('64 / 100');
  for (const sensitive of ['secret-model', '/Users/private', 'secret-key', '12345', 'undefined', 'NaN']) expect(report).not.toContain(sensitive);
  expect(report.length).toBeLessThan(32000);
});
test('clipboard clearly labels frozen or unavailable observations', () => {
  const reading = unavailableTelemetry('runtime_unreachable', 'private error', 1000);
  const report = measurementReport(reading, null, true, '0.5.3', 2000);
  expect(report).toContain('paused — held observations'); expect(report).toContain('runtime_unreachable');
  expect(report).not.toContain('private error');
});

test('a reconnecting view reports held data without saying the user paused it', () => {
  const reading = parseTelemetrySnapshot({ available: true, phase: 'prefill', prefillProgress: 0.5,
    prefillETASeconds: 10, sampledAt: 1 });
  const report = measurementReport(reading, null, 'refreshing', '0.5.7', 2);
  expect(report).toContain('State: refreshing — held observations');
  expect(report).not.toContain('State: paused');
  expect(report).not.toContain('Prefill stage estimate:');
});
