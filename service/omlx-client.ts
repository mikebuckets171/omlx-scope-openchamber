import { normalizeOmlxTelemetry, unavailableTelemetry, type TelemetrySnapshot } from '../src/telemetry.ts';
import { resolveOmlxConfig, type OmlxConfig } from './config.ts';

type JsonObject = { readonly [key: string]: unknown };
type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type JsonResponse = {
  status: number;
  body: JsonObject | null;
  cookie: string | null;
};

type OmlxFailureReason = 'authentication_failed' | 'runtime_unreachable';

class OmlxFailure extends Error {
  readonly reason: OmlxFailureReason;

  constructor(reason: OmlxFailureReason, message: string) {
    super(message);
    this.name = 'OmlxFailure';
    this.reason = reason;
  }
}

const asObject = (value: unknown): JsonObject | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : null
);

const nonnegative = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
);

const extractCookie = (value: string | null): string | null => {
  if (value === null) return null;
  const match = /(?:^|,\s*)omlx_admin_session=([^;,]+)/i.exec(value);
  return match?.[1] ?? null;
};

const responseIsRedirect = (status: number): boolean => status >= 300 && status < 400;

const requestJSON = async ({
  url,
  init,
  fetchImpl,
}: {
  url: URL;
  init?: RequestInit;
  fetchImpl: FetchImplementation;
}): Promise<JsonResponse> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3_000);
  let response: Response;
  try {
    response = await fetchImpl(url.toString(), {
      ...init,
      redirect: 'manual',
      signal: controller.signal,
    });
  } catch {
    throw new OmlxFailure('runtime_unreachable', 'The oMLX runtime did not answer.');
  } finally {
    clearTimeout(timer);
  }
  if (!response || responseIsRedirect(response.status) || response.url !== '' && response.url !== url.toString()) {
    throw new OmlxFailure('runtime_unreachable', 'The oMLX runtime returned an unsafe response.');
  }
  if (response.status === 401 || response.status === 403) {
    throw new OmlxFailure('authentication_failed', 'The oMLX runtime rejected its saved credential.');
  }
  if (response.status !== 200) {
    throw new OmlxFailure('runtime_unreachable', `The oMLX runtime returned HTTP ${response.status}.`);
  }
  let body: JsonObject | null = null;
  try {
    body = asObject(await response.json());
  } catch {
    throw new OmlxFailure('runtime_unreachable', 'The oMLX runtime returned invalid JSON.');
  }
  return {
    status: response.status,
    body,
    cookie: extractCookie(response.headers.get('set-cookie')),
  };
};

const resettableConfig = (config: OmlxConfig): string => `${config.baseURL?.toString() ?? ''}\u0000${config.apiKey ?? ''}`;

const isHealthy = (body: JsonObject | null): boolean => {
  const pool = asObject(body?.engine_pool);
  return body?.status === 'healthy' && nonnegative(pool?.model_count) !== null;
};

const parseContextWindows = (body: JsonObject | null): Map<string, number> => {
  const result = new Map<string, number>();
  const models = Array.isArray(body?.models) ? body.models : [];
  for (const item of models) {
    const model = asObject(item);
    const id = typeof model?.id === 'string' ? model.id : null;
    const limit = nonnegative(model?.max_context_window);
    if (id !== null && limit !== null && limit > 0) result.set(id, Math.trunc(limit));
  }
  return result;
};

export type OmlxClientOptions = {
  fetchImpl?: FetchImplementation;
  readConfig?: () => Promise<OmlxConfig>;
  now?: () => number;
};

/** Read-only oMLX client that keeps credentials and raw payloads in the service. */
export class OmlxClient {
  private readonly fetchImpl: FetchImplementation;
  private readonly readConfig: () => Promise<OmlxConfig>;
  private readonly now: () => number;
  private configKey = '';
  private cookie: string | null = null;
  private stats: JsonObject | null = null;
  private statsAt = 0;
  private identityAt = Number.NEGATIVE_INFINITY;
  private modelStatusAt = Number.NEGATIVE_INFINITY;
  private contextWindows = new Map<string, number>();

  constructor({ fetchImpl = globalThis.fetch, readConfig = resolveOmlxConfig, now = () => Date.now() }: OmlxClientOptions = {}) {
    this.fetchImpl = fetchImpl;
    this.readConfig = readConfig;
    this.now = now;
  }

  async snapshot(): Promise<TelemetrySnapshot> {
    const config = await this.readConfig();
    if (config.baseURL === null) {
      return unavailableTelemetry('runtime_unreachable', config.error);
    }
    if (config.apiKey === null) {
      return unavailableTelemetry('authentication_failed', 'No oMLX API credential was found in OpenCode auth.');
    }
    const key = resettableConfig(config);
    if (key !== this.configKey) {
      this.configKey = key;
      this.cookie = null;
      this.stats = null;
      this.statsAt = 0;
      this.identityAt = Number.NEGATIVE_INFINITY;
      this.modelStatusAt = Number.NEGATIVE_INFINITY;
      this.contextWindows = new Map();
    }

    try {
      const now = this.now();
      if (now - this.identityAt >= 300_000) {
        await this.verifyIdentity(config.baseURL);
        this.identityAt = now;
      }
      if (this.cookie === null) this.cookie = await this.login(config.baseURL, config.apiKey);
      if (now - this.modelStatusAt >= 60_000) {
        this.contextWindows = await this.readModelStatus(config.baseURL, config.apiKey);
        this.modelStatusAt = now;
      }
      if (this.stats === null || now - this.statsAt >= 3_000) {
        this.stats = await this.readStats(config.baseURL, this.cookie);
        this.statsAt = now;
      }
      const activity = await this.readActivity(config.baseURL, this.cookie);
      const normalized = normalizeOmlxTelemetry(
        this.stats,
        activity,
        this.contextWindows,
        config.preferredModel,
        now,
      );
      if (normalized === null) {
        throw new OmlxFailure('runtime_unreachable', 'oMLX returned an unexpected telemetry shape.');
      }
      return normalized;
    } catch (error) {
      if (error instanceof OmlxFailure) {
        if (error.reason === 'authentication_failed') this.cookie = null;
        return unavailableTelemetry(error.reason, error.message);
      }
      this.cookie = null;
      this.stats = null;
      return unavailableTelemetry('runtime_unreachable', 'The oMLX telemetry request failed.');
    }
  }

  async capabilities(): Promise<{ configured: boolean; model: string | null }> {
    const config = await this.readConfig();
    return { configured: config.baseURL !== null && config.apiKey !== null, model: config.preferredModel };
  }

  private async verifyIdentity(baseURL: URL): Promise<void> {
    const response = await requestJSON({
      url: new URL('/health', baseURL),
      fetchImpl: this.fetchImpl,
      init: { method: 'GET', headers: { Accept: 'application/json' } },
    });
    if (!isHealthy(response.body)) {
      throw new OmlxFailure('runtime_unreachable', 'The service answered, but it did not identify as oMLX.');
    }
  }

  private async login(baseURL: URL, apiKey: string): Promise<string> {
    const response = await requestJSON({
      url: new URL('/admin/api/login', baseURL),
      fetchImpl: this.fetchImpl,
      init: {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, remember: false }),
      },
    });
    if (response.cookie === null) {
      throw new OmlxFailure('authentication_failed', 'oMLX login did not return a session.');
    }
    return response.cookie;
  }

  private async readModelStatus(baseURL: URL, apiKey: string): Promise<Map<string, number>> {
    try {
      const response = await requestJSON({
        url: new URL('/v1/models/status', baseURL),
        fetchImpl: this.fetchImpl,
        init: { method: 'GET', headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` } },
      });
      return parseContextWindows(response.body);
    } catch {
      // The supplemental endpoint is optional in older oMLX builds. It must
      // not make the main stats/activity poll fail or retry on every tick.
      return this.contextWindows;
    }
  }

  private async readStats(baseURL: URL, cookie: string): Promise<JsonObject> {
    const response = await requestJSON({
      url: new URL('/admin/api/stats?scope=session', baseURL),
      fetchImpl: this.fetchImpl,
      init: { method: 'GET', headers: { Accept: 'application/json', Cookie: `omlx_admin_session=${cookie}` } },
    });
    if (response.body === null) throw new OmlxFailure('runtime_unreachable', 'oMLX stats were empty.');
    return response.body;
  }

  private async readActivity(baseURL: URL, cookie: string): Promise<JsonObject> {
    const response = await requestJSON({
      url: new URL('/admin/api/activity', baseURL),
      fetchImpl: this.fetchImpl,
      init: { method: 'GET', headers: { Accept: 'application/json', Cookie: `omlx_admin_session=${cookie}` } },
    });
    if (response.body === null) throw new OmlxFailure('runtime_unreachable', 'oMLX activity was empty.');
    return response.body;
  }
}

export const __test__ = {
  asObject,
  extractCookie,
  isHealthy,
  parseContextWindows,
};
