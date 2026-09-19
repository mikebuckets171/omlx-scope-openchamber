import { expect, test } from 'bun:test';
import { ReplyCapture, REPLY_LIMIT_MS, REPLY_WAIT_MS } from './reply-capture.ts';
import { PerformanceCapture, capturedRate } from './capture.ts';
import { parseTelemetrySnapshot, unavailableTelemetry } from '../src/telemetry.ts';
import type { AvailableTelemetry } from '../src/telemetry.ts';

const frame = (ms: number, tokens = ms / 50): AvailableTelemetry => parseTelemetrySnapshot({
  available: true, runtime: 'omlx', phase: 'decode', sampledAt: 1_800_000_000_000 + ms,
  modelID: 'private/model', activeRequests: 1, traceEpoch: 2, completionTokens: tokens,
}) as AvailableTelemetry;
function fixture() {
  let now = 0;
  const capture = new PerformanceCapture(() => now), reply = new ReplyCapture(capture, () => now);
  const step = (ms: number) => { now = ms; reply.observe(frame(ms)); };
  const session = (busy: boolean) => reply.setSession({ id: 'private/chat', busy });
  return { capture, reply, step, session, clock: (ms: number) => { now = ms; } };
}

test('next reply requires an explicit arm on an idle selected chat', () => {
  const { reply, capture, session, step } = fixture();
  expect(reply.arm()).toBe(false); session(true); expect(reply.arm()).toBe(false);
  session(false); step(0); expect(reply.canArm).toBe(true);
  session(true); step(500); expect(capture.current).toBeNull();
  session(false); expect(reply.arm()).toBe(true); expect(reply.arm()).toBe(false);
  step(1000); expect(capture.current).toBeNull(); expect(reply.state).toBe('armed');
});
test('replayed session snapshots cannot start or restart a reply capture', () => {
  const { reply, capture, session, step } = fixture();
  session(false); step(0); reply.arm(); session(false); expect(reply.state).toBe('armed');
  session(true); step(500); const first = capture.current;
  session(true); step(1000); expect(capture.current).toBe(first);
  expect(capture.current?.samples).toBe(2);
});
test('cached pre-start data is skipped; idle ends observations without claiming a successful turn', () => {
  const { reply, capture, session, step } = fixture();
  session(false); step(0); reply.arm(); session(true);
  step(0); expect(capture.current).toBeNull();
  for (const at of [500, 1000, 1500, 2000, 2500]) step(at);
  session(false);
  expect(reply.active).toBe(false); expect(capture.current?.status).toBe('finished');
  expect(capturedRate(capture.current)).toBe(20);
  expect(capture.current?.note).toContain('not a completed-turn result');
  const report = capture.report('0.5.7');
  expect(report).not.toMatch(/private\/|chatId|sessionId/);
  expect(report).toContain('not selected-chat');
});
test('switch, missing session, pause, concurrent workload and runtime loss stop safely', () => {
  for (const reason of ['switch', 'missing', 'pause', 'concurrent', 'offline']) {
    const { reply, capture, session, step } = fixture();
    session(false); step(0); reply.arm(); session(true); step(500);
    if (reason === 'switch') reply.setSession({ id: 'other', busy: true });
    if (reason === 'missing') reply.setSession(null);
    if (reason === 'pause') reply.cancel('Monitoring interrupted');
    if (reason === 'concurrent') reply.observe({ ...frame(1000), activeRequests: 2 });
    if (reason === 'offline') reply.observe(unavailableTelemetry('runtime_unreachable'));
    expect(reply.active).toBe(false); expect(capture.current?.status).toBe('interrupted');
  }
});
test('a switch while armed cancels rather than following a different chat', () => {
  const { reply, capture, session, step } = fixture();
  session(false); reply.arm(); reply.setSession({ id: 'other', busy: true }); step(500);
  expect(reply.state).toBe('idle'); expect(capture.current).toBeNull();
});
test('wait and recording limits use the existing samples without new timers', () => {
  let f = fixture(); f.session(false); f.reply.arm(); f.clock(REPLY_WAIT_MS); f.reply.observe(frame(0));
  expect(f.reply.active).toBe(false); expect(f.reply.message).toContain('two minutes');
  f = fixture(); f.session(false); f.step(0); f.reply.arm(); f.session(true); f.step(500);
  f.clock(REPLY_LIMIT_MS); f.reply.observe(frame(REPLY_LIMIT_MS));
  expect(f.reply.active).toBe(false); expect(f.reply.message).toContain('Ten-minute');
  expect(f.capture.current?.status).toBe('interrupted');
});
test('clock reversal cannot leave capture armed indefinitely', () => {
  const { reply, session, clock } = fixture();
  session(false); clock(1000); reply.arm(); clock(500); session(true);
  expect(reply.active).toBe(false); expect(reply.message).toContain('Clock changed');
});
test('no runtime activity is not a completed or zero-speed result', () => {
  const { reply, capture, session, step } = fixture();
  session(false); step(0); reply.arm(); session(true);
  reply.observe({ ...frame(500), phase: 'idle', activeRequests: 0 }); session(false);
  expect(capture.current).toBeNull(); expect(reply.message).toContain('No oMLX activity');
});
test('arming clears the previous result but retains the pinned reference', () => {
  const { reply, capture, session, step } = fixture();
  capture.start(frame(0), 30); step(500); capture.observe(frame(2000)); capture.stop(); capture.pin();
  const pinned = capture.baseline; expect(pinned).not.toBeNull();
  session(false); expect(reply.arm()).toBe(true);
  expect(capture.current).toBeNull(); expect(capture.baseline).toBe(pinned);
});
