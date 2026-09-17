import { describe, expect, it } from 'bun:test';
import { parseLoopbackOrigin, pathsForHome, resolveOmlxConfig } from './config.ts';

describe('OMLX Scope service configuration', () => {
  it('accepts only numeric loopback HTTP origins', () => {
    expect(parseLoopbackOrigin('http://127.0.0.1:8123')?.toString()).toBe('http://127.0.0.1:8123/');
    expect(parseLoopbackOrigin('https://127.0.0.1:8123')).toBeNull();
    expect(parseLoopbackOrigin('http://localhost:8123')).toBeNull();
    expect(parseLoopbackOrigin('http://127.0.0.1:8123?x=1')).toBeNull();
    expect(parseLoopbackOrigin('http://127.0.0.1:8123/path', true)).toBeNull();
    expect(parseLoopbackOrigin('http://user:pass@127.0.0.1:8123')).toBeNull();
    expect(parseLoopbackOrigin('http://127.0.0.1')).toBeNull();
  });

  it('strips a provider /v1 path from the configured endpoint', () => {
    expect(parseLoopbackOrigin('http://127.0.0.1:8123/v1', true)?.toString()).toBe('http://127.0.0.1:8123/');
    expect(parseLoopbackOrigin('http://127.0.0.1:8123/v1')).toBeNull();
  });

  it('reads the existing OpenCode provider and auth files without exposing the key', async () => {
    const home = '/tmp/omlx-scope-test-home';
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
    expect(config).toMatchObject({ issue: 'none', source: 'opencode', configStatus: 'present', authStatus: 'present' });
  });

  it('uses the native oMLX settings endpoint when OpenCode has no provider URL', async () => {
    const home = '/tmp/omlx-scope-test-home';
    const paths = pathsForHome(home);
    const files = new Map([[paths.omlx, JSON.stringify({ server: { host: '127.0.0.1', port: 8123 } })]]);
    const config = await resolveOmlxConfig({
      env: {},
      home,
      readText: async (path) => files.get(path) ?? null,
    });
    expect(config.baseURL?.toString()).toBe('http://127.0.0.1:8123/');
    expect(config.issue).toBe('missing_credential');
    expect(config.source).toBe('omlx');
  });

  it('supports isolated OMLX_SCOPE environment overrides', async () => {
    const config = await resolveOmlxConfig({
      env: {
        OMLX_SCOPE_BASE_URL: 'http://127.0.0.1:9123',
        OMLX_SCOPE_API_KEY: 'private-key',
        OMLX_SCOPE_MODEL: 'Qwen3.8-27B-Instruct-4bit',
      },
      home: '/tmp/omlx-scope-test-home',
      readText: async () => null,
    });
    expect(config.baseURL?.toString()).toBe('http://127.0.0.1:9123/');
    expect(config.apiKey).toBe('private-key');
    expect(config.preferredModel).toBe('Qwen3.8-27B-Instruct-4bit');
    expect(config).toMatchObject({ issue: 'none', configStatus: 'missing', authStatus: 'missing' });
  });

  it('reads JSONC from an explicit OpenCode config and uses the documented data directory', async () => {
    const home = '/tmp/omlx-scope-jsonc-home';
    const dataHome = `${home}/data`;
    const custom = `${home}/custom/opencode.jsonc`;
    const paths = pathsForHome(home, { XDG_DATA_HOME: dataHome });
    const files = new Map<string, string>([
      [custom, '{\n  // local override\n  "model": "omlx/qwen",\n  "provider": { "omlx": { "options": { "baseURL": "http://127.0.0.1:8123/v1", }, }, },\n}'],
      [paths.auth, JSON.stringify({ omlx: { type: 'api', key: 'private-key' } })],
    ]);
    const config = await resolveOmlxConfig({
      env: { OPENCODE_CONFIG: custom, XDG_DATA_HOME: dataHome },
      home,
      readText: async (path) => files.get(path) ?? null,
    });
    expect(config).toMatchObject({
      baseURL: new URL('http://127.0.0.1:8123/'),
      preferredModel: 'qwen',
      apiKey: 'private-key',
      issue: 'none',
      source: 'opencode',
      configStatus: 'present',
      authStatus: 'present',
    });
  });

  it('does not silently fall back after an explicit config is malformed', async () => {
    const home = '/tmp/omlx-scope-malformed-home';
    const paths = pathsForHome(home);
    const custom = `${home}/custom.json`;
    const files = new Map<string, string>([
      [paths.openCode, JSON.stringify({ provider: { omlx: { options: { baseURL: 'http://127.0.0.1:8123' } } } })],
      [custom, '{ "provider": '],
      [paths.auth, JSON.stringify({ omlx: { type: 'api', key: 'private-key' } })],
    ]);
    const config = await resolveOmlxConfig({
      env: { OPENCODE_CONFIG: custom },
      home,
      readText: async (path) => files.get(path) ?? null,
    });
    expect(config).toMatchObject({ baseURL: null, apiKey: 'private-key', issue: 'malformed_config', configStatus: 'malformed' });
  });

  it('distinguishes unreadable and malformed supported files', async () => {
    const home = '/tmp/omlx-scope-status-home';
    const paths = pathsForHome(home);
    const config = await resolveOmlxConfig({
      env: { OMLX_SCOPE_API_KEY: 'private-key' },
      home,
      readText: async (path) => path === paths.openCode ? { kind: 'unreadable' } : path === paths.openCodeJSONC ? '{ bad' : null,
    });
    expect(config).toMatchObject({ baseURL: null, issue: 'unreadable_config', configStatus: 'malformed', authStatus: 'missing' });
  });
});
