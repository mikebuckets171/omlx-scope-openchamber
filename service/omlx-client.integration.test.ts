import { afterEach, describe, expect, it } from 'bun:test';
import http from 'node:http';
import { OmlxClient } from './omlx-client.ts';
import type { OmlxConfig } from './config.ts';

type Handler = (request: http.IncomingMessage, response: http.ServerResponse) => void;

class MockServer {
  private server: http.Server | null = null;
  readonly port: number;
  readonly url: URL;
  private handler: Handler;

  constructor(handler: Handler) {
    this.handler = handler;
    this.server = http.createServer((req, res) => this.handler(req, res));
    this.server.listen(0, '127.0.0.1');
    const address = this.server.address();
    if (address === null || typeof address === 'string') throw new Error('Mock server failed to bind.');
    this.port = address.port;
    this.url = new URL(`http://127.0.0.1:${this.port}/`);
  }

  setHandler(handler: Handler): void { this.handler = handler; }

  async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    this.server = null;
  }
}

const json = (res: http.ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}): void => {
  res.statusCode = status;
  for (const [key, value] of Object.entries({ 'Content-Type': 'application/json', ...extraHeaders })) res.setHeader(key, value);
  res.end(JSON.stringify(body));
};

const ok = (body: unknown): string => JSON.stringify(body);

describe('OmlxClient integration with local mock oMLX', () => {
  let server: MockServer | null = null;

  afterEach(async () => {
    await server?.stop();
    server = null;
  });

  const startServer = (handler: Handler): MockServer => {
    server = new MockServer(handler);
    return server;
  };

  const baseConfig = (port: number): OmlxConfig => ({
    baseURL: new URL(`http://127.0.0.1:${port}/`),
    apiKey: 'private-key',
    preferredModel: null,
    error: null,
    issue: 'none',
    source: 'environment',
    configStatus: 'present',
    authStatus: 'present',
  });

  it('handles redirects, status codes, oversized bodies, slow bodies, and dead sockets', async () => {
    const calls: string[] = [];
    let statsCalls = 0;
    let oversizedCalls = 0;
    let slowCalls = 0;
    let deadCalls = 0;

    const handler: Handler = (request, response) => {
      calls.push(request.url ?? '');
      const path = (request.url ?? '').split('?')[0];
      if (path.endsWith('/health')) {
        if (calls.filter((c) => c.startsWith('/health')).length === 1) {
          response.statusCode = 302;
          response.setHeader('Location', 'https://attacker.example.com');
          response.end();
          return;
        }
        json(response, 200, { status: 'healthy', engine_pool: { model_count: 1 } });
        return;
      }
      if (path.endsWith('/v1/models/status')) {
        json(response, 200, { models: [{ id: 'qwen', max_context_window: 4096 }] });
        return;
      }
      if (path.endsWith('/admin/api/login')) {
        json(response, 200, { ok: true }, { 'set-cookie': 'omlx_admin_session=test; Path=/' });
        return;
      }
      if (path.includes('/admin/api/stats')) {
        statsCalls += 1;
        json(response, 503, { error: 'temporary' });
        return;
      }
      if (path.endsWith('/admin/api/activity')) {
        if (calls.filter((c) => c.startsWith('/admin/api/activity')).length === 1) {
          oversizedCalls += 1;
          response.setHeader('Content-Type', 'application/octet-stream');
          const chunks: Buffer[] = [];
          for (let i = 0; i < 3_000_000; i += 1) chunks.push(Buffer.from('a'));
          response.end(Buffer.concat(chunks));
          return;
        }
        if (calls.filter((c) => c.startsWith('/admin/api/activity')).length === 2) {
          slowCalls += 1;
          setTimeout(() => response.end(ok({ active_models: { models: [] } })), 5_000);
          return;
        }
        deadCalls += 1;
        request.socket.destroy();
        return;
      }
      json(response, 404, { error: 'not_found' });
    };

    const local = startServer(handler);
    const client = new OmlxClient({
      fetchImpl: globalThis.fetch,
      readConfig: async () => baseConfig(local.port),
      now: () => 100_000,
      requestTimeoutMs: 500,
      collectionDeadlineMs: 1_000,
    });

    const first = await client.snapshot();
    expect(first).toMatchObject({ available: false, reason: 'runtime_unreachable' });
    await client.snapshot();
    await client.snapshot();
    await client.snapshot();
    await client.snapshot();
    expect(statsCalls).toBeGreaterThanOrEqual(2);
    expect(oversizedCalls).toBeGreaterThanOrEqual(1);
    expect(slowCalls).toBeGreaterThanOrEqual(1);
    expect(deadCalls).toBeGreaterThanOrEqual(1);
    expect(calls.filter((c) => c.startsWith('/health')).length).toBeGreaterThanOrEqual(1);
  });

  it('survives concurrent consumers sharing a single snapshot', async () => {
    let activityCalls = 0;
    const local = startServer((req, res) => {
      const path = (req.url ?? '').split('?')[0];
      if (path.endsWith('/health')) json(res, 200, { status: 'healthy', engine_pool: { model_count: 1 } });
      else if (path.endsWith('/admin/api/login')) json(res, 200, { ok: true }, { 'set-cookie': 'omlx_admin_session=test; Path=/' });
      else if (path.endsWith('/v1/models/status')) json(res, 200, { models: [{ id: 'qwen', max_context_window: 4096 }] });
      else if (path.includes('/admin/api/stats')) json(res, 200, { engines: {}, active_models: { models: [] }, total_requests: 0 });
      else if (path.endsWith('/admin/api/activity')) {
        activityCalls += 1;
        json(res, 200, { active_models: { models: [] } });
      } else json(res, 404, {});
    });
    const client = new OmlxClient({ readConfig: async () => baseConfig(local.port) });
    const snapshots = await Promise.all(Array.from({ length: 8 }, () => client.snapshot()));
    expect(snapshots.length).toBe(8);
    expect(activityCalls).toBe(1);
  });

  it('returns unauthenticated telemetry when the credential is rejected', async () => {
    const local = startServer((req, res) => {
      const path = (req.url ?? '').split('?')[0];
      if (path.endsWith('/health')) json(res, 200, { status: 'healthy', engine_pool: { model_count: 1 } });
      else if (path.endsWith('/admin/api/login')) json(res, 403, { error: 'denied' });
      else json(res, 404, {});
    });
    const client = new OmlxClient({ readConfig: async () => baseConfig(local.port) });
    const result = await client.snapshot();
    expect(result).toMatchObject({ available: false, reason: 'authentication_failed' });
  });
});
