import { expect, test } from 'bun:test';
import { PerformanceCapture, capturedRate } from './capture.ts';
import { parseTelemetrySnapshot, unavailableTelemetry } from '../src/telemetry.ts';
import type { AvailableTelemetry } from '../src/telemetry.ts';
const frame = (ms: number, tokens = ms / 50) => parseTelemetrySnapshot({ available: true, runtime: 'omlx', phase: 'decode', sampledAt: 1_800_000_000_000 + ms, modelID: 'private/model', activeRequests: 1, traceEpoch: 2, completionTokens: tokens, liveDecodeTPS: 999, memory: {activeGB: 20}, system: {platform:'macOS', cpuPercent:12, sampledAt:1_800_000_000_000+ms, memoryTotalGB:48, memoryUsedGB:30, macOS:{swapUsedGB:1,sampledAt:1_800_000_000_000+ms}} }) as AvailableTelemetry;

test('capture records existing intervals, not request averages, and finishes at its bounded window', () => {
  let clock = 0; const c = new PerformanceCapture(() => clock);
  expect(c.start(frame(0, 0), 30)).toBe(true);
  for (clock=500;clock<=30_000;clock+=500) c.observe(frame(clock));
  expect(c.current?.status).toBe('finished'); expect(c.current?.samples).toBe(61);
  expect(capturedRate(c.current)).toBe(20); expect(c.current?.peakProcessGB).toBe(20);
  expect(c.current?.peakCPU).toBe(12); expect(c.current?.startSwapGB).toBe(1);
  const last = structuredClone(c.current); c.observe(frame(40_000)); expect(c.current).toEqual(last);
});
test('capture cannot start idle, without attribution, or concurrently; never starts twice', () => {
  const c = new PerformanceCapture(() => 0);
  expect(c.start(unavailableTelemetry('runtime_unreachable'),30)).toBe(false);
  expect(c.start({...frame(0), activeRequests:2},30)).toBe(false);
  expect(c.start({...frame(0), phase:'idle'},30)).toBe(false);
  expect(c.start({...frame(0), modelID:null},30)).toBe(false);
  expect(c.start(frame(0),30)).toBe(true); expect(c.start(frame(0),30)).toBe(false);
});
test('capture de-duplicates cached snapshots and breaks counters at request changes', () => {
  let now=0; const c=new PerformanceCapture(()=>now); c.start(frame(0,100),30);
  now=1000;c.observe(frame(0,100));expect(c.current?.samples).toBe(1);
  c.observe(frame(1000,120));now=2000;c.observe({...frame(2000,90000),traceEpoch:3});
  now=3000;c.observe({...frame(3000,90020),traceEpoch:3});
  expect(c.current?.decodeTokens).toBe(40);expect(capturedRate(c.current)).toBe(20);
});
test('pause, unavailable runtime, clock reversal and long gaps produce partial records', () => {
  for (const kind of ['pause','offline','gap','clock','model']) {
    let now=0;const c=new PerformanceCapture(()=>now);c.start(frame(0),60);
    if(kind==='pause') c.stop('Monitoring interrupted');
    if(kind==='offline') c.observe(unavailableTelemetry('runtime_unreachable'));
    if(kind==='gap'){now=13000;c.observe(frame(now));}
    if(kind==='clock'){now=-1;c.observe(frame(500));}
    if(kind==='model'){now=500;c.observe({...frame(500),modelID:'other'});}
    expect(c.current?.status).toBe('interrupted');expect(c.recording).toBe(false);
  }
});
test('two bounded summaries compare observed generation only and redact identity from reports', () => {
  let now=0;const c=new PerformanceCapture(()=>now);c.start(frame(0),30);
  for(now=1000;now<=6000;now+=1000)c.observe(frame(now));c.stop();expect(c.pin()).toBe(true);
  now=10000;c.start(frame(10000,0),30);
  for(now=11000;now<=16000;now+=1000)c.observe(frame(now,(now-10000)/40));c.stop();
  expect(c.comparison()).toBeCloseTo(25);
  const report=c.report('0.5.5');expect(report).not.toContain('private/model');expect(report).toContain('partial');
  expect(report).not.toContain('traceEpoch');expect(report).toContain('not selected-chat');
  c.clear();expect(c.current).toBeNull();expect(c.baseline).toBeNull();
});
