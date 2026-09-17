import { expect, test } from 'bun:test';
import { Poller } from './poller.ts';

test('coalesces refreshes and never schedules after pause/stop during a request', async () => {
  let resolve!: (delay: number) => void;
  let calls = 0;
  const poller = new Poller(() => { calls += 1; return new Promise((done) => { resolve = done; }); });
  poller.start();
  const first = poller.refresh();
  expect(poller.refresh()).toBe(first);
  poller.setPaused(true);
  resolve(1);
  await first;
  await Bun.sleep(10);
  expect(calls).toBe(1);
  poller.setPaused(false);
  expect(calls).toBe(2);
  const second = poller.refresh();
  poller.stop();
  resolve(1);
  await second;
  await Bun.sleep(10);
  expect(calls).toBe(2);
});
