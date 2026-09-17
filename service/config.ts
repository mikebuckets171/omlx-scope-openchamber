import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

type JsonObject = { readonly [key: string]: unknown };

export type OmlxConfig = {
  baseURL: URL | null;
  apiKey: string | null;
  preferredModel: string | null;
  error: string | null;
};

export type ConfigPaths = {
  openCode: string;
  omlx: string;
  auth: string;
};

type ConfigInput = {
  env?: NodeJS.ProcessEnv;
  home?: string;
  readText?: (path: string) => Promise<string | null>;
};

const asObject = (value: unknown): JsonObject | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : null
);

const nonempty = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readJson = async (path: string, readText: (path: string) => Promise<string | null>): Promise<JsonObject | null> => {
  const content = await readText(path);
  if (content === null) return null;
  try {
    return asObject(JSON.parse(content));
  } catch {
    return null;
  }
};

const defaultReadText = async (path: string): Promise<string | null> => {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
};

export const pathsForHome = (home: string, env: NodeJS.ProcessEnv = process.env): ConfigPaths => {
  const configHome = nonempty(env.XDG_CONFIG_HOME) ?? join(home, '.config');
  return {
    openCode: join(configHome, 'opencode', 'opencode.json'),
    omlx: join(home, '.omlx', 'settings.json'),
    auth: join(home, '.local', 'share', 'opencode', 'auth.json'),
  };
};

/**
 * Keep the plugin's loopback-origin contract. The returned URL
 * is always an origin with a trailing slash; no configured path is retained.
 */
export const parseLoopbackOrigin = (value: unknown, stripPath = false): URL | null => {
  const candidate = nonempty(value);
  if (candidate === null) return null;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port.length === 0) return null;
  if (url.username || url.password || url.search || url.hash) return null;
  if (!stripPath && url.pathname !== '' && url.pathname !== '/') return null;
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url;
};

const providerOptions = (config: JsonObject | null): JsonObject | null => {
  const providers = asObject(config?.provider);
  const omlx = asObject(providers?.omlx);
  return asObject(omlx?.options);
};

const selectedOmlxModel = (config: JsonObject | null, env: NodeJS.ProcessEnv): string | null => {
  const configured = nonempty(env.OMLX_SCOPE_MODEL);
  if (configured !== null) return configured;
  const model = nonempty(config?.model);
  if (model === null) return null;
  const [provider, ...rest] = model.split('/');
  return provider === 'omlx' && rest.length > 0 ? rest.join('/') : null;
};

const nativeEndpoint = (settings: JsonObject | null): string | null => {
  const server = asObject(settings?.server);
  const host = nonempty(server?.host) ?? '127.0.0.1';
  const port = typeof server?.port === 'number' && Number.isInteger(server.port)
    ? server.port
    : null;
  return port !== null && port >= 1 && port <= 65_535 ? `http://${host}:${port}` : null;
};

/** Resolve the local OpenCode and oMLX configuration files used by the plugin. */
export const resolveOmlxConfig = async ({ env = process.env, home = env.HOME ?? homedir(), readText = defaultReadText }: ConfigInput = {}): Promise<OmlxConfig> => {
  const paths = pathsForHome(home, env);
  const [openCode, omlx, auth] = await Promise.all([
    readJson(paths.openCode, readText),
    readJson(paths.omlx, readText),
    readJson(paths.auth, readText),
  ]);

  const providerBase = providerOptions(openCode)?.baseURL;
  const envBase = nonempty(env.OMLX_SCOPE_BASE_URL);
  const baseCandidate = envBase ?? (typeof providerBase === 'string' ? providerBase : nativeEndpoint(omlx));
  const baseURL = parseLoopbackOrigin(baseCandidate, envBase === null && typeof providerBase === 'string');
  const error = baseCandidate === null
    ? 'No oMLX endpoint was found in OpenCode or oMLX configuration.'
    : baseURL === null
      ? 'The saved oMLX endpoint is not a numeric loopback HTTP origin.'
      : null;

  const envKey = nonempty(env.OMLX_SCOPE_API_KEY);
  const authProvider = asObject(asObject(auth?.omlx));
  const authKey = authProvider?.type === 'api' ? nonempty(authProvider.key) : null;

  return {
    baseURL,
    apiKey: envKey ?? authKey,
    preferredModel: selectedOmlxModel(openCode, env),
    error,
  };
};

export const __test__ = {
  asObject,
  nativeEndpoint,
  providerOptions,
  selectedOmlxModel,
  nonempty,
};
