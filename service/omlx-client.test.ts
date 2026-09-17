import { describe, expect, it } from 'bun:test';
import { OmlxClient, __test__ } from './omlx-client.ts';

const response = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), {
  status: 200,
  headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  ...init,
});

const config = {
  baseURL: new URL('http://127.0.0.1:8123/'),
  apiKey: 'private-key',
  preferredModel: null,
  error: null,
};

describe('OMLX Scope service client', () => {
  it('extracts only the oMLX session cookie', () => {
    expect(__test__.extractCookie('other=x; Path=/, omlx_admin_session=abc123; HttpOnly')).toBe('abc123');
    expect(__test__.extractCookie(null)).toBeNull();
  });

  it('performs health, optional model status, login, stats, and activity reads', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calls.push({ url: String(url), init: init ?? {} });
      if (String(url).endsWith('/health')) return response({ status: 'healthy', engine_pool: { model_count: 1 } });
      if (String(url).endsWith('/v1/models/status')) return response({ models: [{ id: 'qwen', max_context_window: 8192 }] });
      if (String(url).endsWith('/admin/api/login')) return response({ ok: true }, { headers: { 'set-cookie': 'omlx_admin_session=test-cookie; Path=/' } });
      if (String(url).includes('/admin/api/stats')) return response({
        engines: { mlx: 1 },
        total_requests: 1,
        active_models: { models: [{ id: 'qwen', active_requests: 0, waiting_requests: 0, prefilling: [], generating: [], waiting: [], activities: [] }] },
      });
      if (String(url).endsWith('/admin/api/activity')) return response({
        active_models: { models: [{ id: 'qwen', active_requests: 0, waiting_requests: 0, prefilling: [], generating: [], waiting: [], activities: [] }] },
      });
      return response({ error: 'not found' }, { status: 404 });
    };
    const client = new OmlxClient({ fetchImpl, readConfig: async () => config, now: () => 100_000 });
    const result = await client.snapshot();
    expect(result).toMatchObject({ available: true, modelID: 'qwen', contextWindow: 8192 });
    expect(calls.map((call) => call.url)).toEqual([
      'http://127.0.0.1:8123/health',
      'http://127.0.0.1:8123/admin/api/login',
      'http://127.0.0.1:8123/v1/models/status',
      'http://127.0.0.1:8123/admin/api/stats?scope=session',
      'http://127.0.0.1:8123/admin/api/activity',
    ]);
    expect((calls[1].init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect((calls[2].init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect((calls[3].init.headers as Record<string, string>).Cookie).toBe('omlx_admin_session=test-cookie');
  });

  it('coalesces panels, caches config and returns a valid no-model snapshot', async () => {
    let reads = 0;
    let activities = 0;
    let now = 100_000;
    const fetchImpl = async (url: RequestInfo | URL): Promise<Response> => {
      if (String(url).endsWith('/health')) return response({ status: 'healthy', engine_pool: { model_count: 0 } });
      if (String(url).endsWith('/admin/api/login')) return response({}, { headers: { 'set-cookie': 'omlx_admin_session=fixture;' } });
      if (String(url).includes('/stats')) return response({ engines: {}, total_requests: 0, active_models: { models: [] } });
      if (String(url).endsWith('/activity')) { activities += 1; return response({ active_models: { models: [] } }); }
      return response({ models: [] });
    };
    const client = new OmlxClient({ now: () => now, readConfig: async () => { reads += 1; return config; }, fetchImpl });
    const first = client.snapshot();
    expect(client.snapshot()).toBe(first);
    expect(await first).toMatchObject({ available: true, phase: 'notLoaded' });
    await client.snapshot();
    expect(activities).toBe(1);
    now += 500;
    await client.snapshot();
    expect(activities).toBe(2);
    expect(reads).toBe(1);
    now += 5_000;
    await client.snapshot();
    expect(reads).toBe(2);
  });

  it('observes prefill staleness and opaque request continuity without leaking IDs', async () => {
    let now = 100_000;
    let requestID = 'private-original';
    const active = () => ({ models: [{ id: 'fixture', active_requests: 1, prefilling: [{ request_id: requestID, processed: 5, total: 100, speed: 50 }] }] });
    const client = new OmlxClient({ now: () => now, readConfig: async () => config, fetchImpl: async (url) => {
      if (String(url).endsWith('/health')) return response({ status: 'healthy', engine_pool: { model_count: 1 } });
      if (String(url).endsWith('/login')) return response({}, { headers: { 'set-cookie': 'omlx_admin_session=fixture;' } });
      if (String(url).includes('/stats')) return response({ engines: {}, total_requests: 1, active_models: active() });
      if (String(url).endsWith('/activity')) return response({ active_models: active() });
      return response({ models: [] });
    } });
    const first = await client.snapshot();
    expect(first.livePrefillTPS).toBe(50);
    now += 16_000;
    expect((await client.snapshot()).livePrefillTPS).toBeNull();
    requestID = 'private-next';
    now += 500;
    const next = await client.snapshot();
    expect(next.traceEpoch).not.toBe(first.traceEpoch);
    expect(next.livePrefillTPS).toBe(50);
    expect(JSON.stringify(next)).not.toContain('private-');
  });

  it('rejects redirects before sending credentials anywhere else', async () => {
    const calls: string[] = [];
    const client = new OmlxClient({ readConfig: async () => config, fetchImpl: async (url, init) => {
      calls.push(String(url));
      expect(init?.redirect).toBe('manual');
      return new Response('', { status: 302, headers: { Location: 'https://example.com' } });
    } });
    expect((await client.snapshot()).available).toBe(false);
    expect(calls).toEqual(['http://127.0.0.1:8123/health']);
  });
});
