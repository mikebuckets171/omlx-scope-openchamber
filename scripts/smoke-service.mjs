import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createServer as createHTTPServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Test the extracted install, not TypeScript or a checkout with node_modules.
assert(process.argv[2], 'Pass the extracted extension directory.');
const root = resolve(process.argv[2]);
const home = await mkdtemp(join(tmpdir(), 'omlx-scope-smoke-'));
const token = randomBytes(24).toString('hex');
const children = [];
let mockRuntime = null;

function start(port, overrides = {}) {
  const child = spawn(process.execPath, [join(root, 'service/main.js')], {
    cwd: root,
    // Never inherit credentials, NODE_PATH, NODE_OPTIONS or the real home.
    env: {
      PATH: process.env.PATH ?? '', HOME: home,
      XDG_CONFIG_HOME: join(home, '.config'), XDG_DATA_HOME: join(home, '.local/share'),
      TMPDIR: home, TMP: home, TEMP: home,
      OPENCHAMBER_SERVICE_PORT: String(port), OPENCHAMBER_SERVICE_TOKEN: token,
      ...overrides,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const state = { child, log: '', closed: false, result: null, done: null };
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (text) => { state.log = (state.log + text).slice(-16_384); });
  state.done = new Promise((resolveDone) => {
    child.once('error', (error) => { state.log += String(error); });
    child.once('close', (code, signal) => {
      state.closed = true;
      state.result = { code, signal };
      resolveDone(state.result);
    });
  });
  children.push(state);
  return state;
}

async function stop(state) {
  if (!state.closed) {
    state.child.kill('SIGTERM');
    const killTimer = setTimeout(() => state.child.kill('SIGKILL'), 2_500);
    try { await state.done; } finally { clearTimeout(killTimer); }
  }
}

async function unusedPort() {
  const probe = createServer();
  await new Promise((resolveListen, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolveListen);
  });
  const { port } = probe.address();
  await new Promise((resolveClose, reject) => probe.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

try {
  const config = join(home, '.config/opencode');
  await mkdir(config, { recursive: true });
  // Exercise the bundled JSONC parser. No credential means no oMLX request.
  await writeFile(join(config, 'opencode.jsonc'), `// isolated smoke fixture
{
  "provider": { "omlx": { "options": { "baseURL": "http://127.0.0.1:1/v1" } } },
  "model": "omlx/smoke",
}
`);
  const port = await unusedPort();
  const service = start(port);
  const url = `http://127.0.0.1:${port}`;
  const get = (path, authorized = true) => fetch(url + path, {
    headers: authorized ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(3_000),
  });
  let healthy = false;
  const deadline = performance.now() + 5_000;
  while (performance.now() < deadline) {
    assert(!service.closed, `Bundled service exited before readiness:\n${service.log}`);
    try {
      const response = await get('/health');
      healthy = response.status === 200 && (await response.json()).status === 'healthy';
      if (healthy) break;
    } catch { /* The child may still be binding its listener. */ }
    await delay(50);
  }
  assert(healthy, `Bundled service did not become ready:\n${service.log}`);
  assert.equal((await get('/health', false)).status, 401);
  assert.equal((await get('/snapshot', false)).status, 401);
  const response = await get('/snapshot');
  assert.equal(response.status, 200);
  const snapshot = await response.json();
  assert.equal(snapshot.available, false);
  assert.equal(snapshot.reason, 'authentication_failed', 'JSONC endpoint must parse successfully before missing-credential reporting.');
  assert(snapshot.system && typeof snapshot.system === 'object', 'Host readings must survive unavailable oMLX.');

  // A real bind failure must exit and retain its actionable cause in stderr.
  const collision = start(port);
  const failureDeadline = performance.now() + 3_000;
  while (!collision.closed && performance.now() < failureDeadline) await delay(25);
  assert(collision.closed, 'Service did not exit after a port conflict.');
  assert.equal(collision.result.code, 1);
  assert.match(collision.log, /EADDRINUSE/);
  assert(!collision.log.includes(token), 'Startup diagnostics exposed the service token.');
  await stop(service);
  assert.equal(service.result.code, 0, 'Service did not stop cleanly.');
  // Exercise real HTTP collection through the extracted, minified Node bundle.
  let flight = { request_id: 'private-smoke-request', processed: 64, total: 100, speed: 184 };
  mockRuntime = createHTTPServer((request, response) => {
    const path = new URL(request.url, 'http://127.0.0.1').pathname;
    let body;
    if (path === '/health') body = { status: 'healthy', engine_pool: { model_count: 1 } };
    else if (path === '/admin/api/login') {
      response.setHeader('Set-Cookie', 'omlx_admin_session=smoke; HttpOnly'); body = {};
    } else if (path === '/v1/models/status') body = { models: [] };
    else if (path === '/admin/api/activity' || path === '/admin/api/stats') {
      body = { engines: {}, active_models: { models: [{ id: 'fixture', active_requests: 1, prefilling: [flight] }] } };
    } else { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(body));
  });
  await new Promise((resolveListen, reject) => { mockRuntime.once('error', reject); mockRuntime.listen(0, '127.0.0.1', resolveListen); });
  const activeService = start(port, { OMLX_SCOPE_BASE_URL: `http://127.0.0.1:${mockRuntime.address().port}`, OMLX_SCOPE_API_KEY: 'isolated-smoke-key' });
  let ready = false;
  const nextDeadline = performance.now() + 5000;
  while (performance.now() < nextDeadline && !activeService.closed) {
    try { ready = (await get('/health')).status === 200; if (ready) break; } catch {}
    await delay(50);
  }
  assert(ready, `Packaged service did not restart: ${activeService.log}`);
  const activeSnapshot = await (await get('/snapshot')).json();
  assert.equal(activeSnapshot.available, true);
  assert.equal(activeSnapshot.prefillProgress, 0.64);
  assert.equal(activeSnapshot.prefillProcessedTokens, 64);
  assert.equal(activeSnapshot.prefillTotalTokens, 100);
  assert.equal(activeSnapshot.prefillProgressStale, false);
  assert(!JSON.stringify(activeSnapshot).includes('private-smoke-request'));
  assert(!JSON.stringify(activeSnapshot).includes('isolated-smoke-key'));
  flight = { ...flight, processed: 101 };
  await delay(550);
  const invalid = await (await get('/snapshot')).json();
  assert.equal(invalid.prefillProgress, null, 'Malformed progress must not become 100% complete.');
  await stop(activeService);
  console.log('PASS: packaged prefill counters and invalid-progress rejection verified against loopback fixture.');
  console.log('PASS: packaged Node service starts without node_modules; /health, /snapshot, JSONC, authentication, startup errors, and shutdown verified.');
} finally {
  await Promise.all(children.map(stop));
  if (mockRuntime) { mockRuntime.closeAllConnections(); await new Promise(resolveClose => mockRuntime.close(resolveClose)); }
  await rm(home, { recursive: true, force: true });
}
