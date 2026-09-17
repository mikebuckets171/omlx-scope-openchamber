import { describe, expect, it } from 'bun:test';
import { parseLoopbackOrigin, pathsForHome, resolveOmlxConfig } from './config.ts';

describe('oMLX Telemetry service configuration', () => {
  it('accepts only numeric loopback HTTP origins', () => {
    expect(parseLoopbackOrigin('http://127.0.0.1:8123')?.toString()).toBe('http://127.0.0.1:8123/');
    expect(parseLoopbackOrigin('https://127.0.0.1:8123')).toBeNull();
    expect(parseLoopbackOrigin('http://localhost:8123')).toBeNull();
    expect(parseLoopbackOrigin('http://127.0.0.1:8123?x=1')).toBeNull();
    expect(parseLoopbackOrigin('http://127.0.0.1')).toBeNull();
  });

  it('strips a provider /v1 path from the configured endpoint', () => {
    expect(parseLoopbackOrigin('http://127.0.0.1:8123/v1', true)?.toString()).toBe('http://127.0.0.1:8123/');
    expect(parseLoopbackOrigin('http://127.0.0.1:8123/v1')).toBeNull();
  });

  it('reads the existing OpenCode provider and auth files without exposing the key', async () => {
    const home = '/tmp/omlx-telemetry-test-home';
    const paths = pathsForHome(home, { XDG_CONFIG_HOME: `${home}/config` });
    const files = new Map([
      [paths.openCode, JSON.stringify({
        model: 'omlx/Qwen3.8-27B-Instruct-4bit',
        provider: { omlx: { options: { baseURL: 'http://127.0.0.1:8123/v1' } } },
      })],
      [paths.auth, JSON.stringify({ omlx: { type: 'api', key: 'private-key' } })],
    ]);
    const config = await resolveOmlxConfig({
      env: { XDG_CONFIG_HOME: `${home}/config` },
      home,
      readText: async (path) => files.get(path) ?? null,
    });
    expect(config.baseURL?.toString()).toBe('http://127.0.0.1:8123/');
    expect(config.preferredModel).toBe('Qwen3.8-27B-Instruct-4bit');
    expect(config.apiKey).toBe('private-key');
  });

  it('uses the native oMLX settings endpoint when OpenCode has no provider URL', async () => {
    const home = '/tmp/omlx-telemetry-test-home';
    const paths = pathsForHome(home);
    const files = new Map([[paths.omlx, JSON.stringify({ server: { host: '127.0.0.1', port: 8123 } })]]);
    const config = await resolveOmlxConfig({
      env: {},
      home,
      readText: async (path) => files.get(path) ?? null,
    });
    expect(config.baseURL?.toString()).toBe('http://127.0.0.1:8123/');
  });

  it('supports isolated OMLX_TELEMETRY environment overrides', async () => {
    const config = await resolveOmlxConfig({
      env: {
        OMLX_TELEMETRY_BASE_URL: 'http://127.0.0.1:9123',
        OMLX_TELEMETRY_API_KEY: 'private-key',
        OMLX_TELEMETRY_MODEL: 'Qwen3.8-27B-Instruct-4bit',
      },
      home: '/tmp/omlx-telemetry-test-home',
      readText: async () => null,
    });
    expect(config.baseURL?.toString()).toBe('http://127.0.0.1:9123/');
    expect(config.apiKey).toBe('private-key');
    expect(config.preferredModel).toBe('Qwen3.8-27B-Instruct-4bit');
  });
});
