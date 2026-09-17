// service/main.ts
import http from "node:http";

// src/telemetry.ts
var asObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
var finite = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
var nonnegative = (value) => {
  const number = finite(value);
  return number !== null && number >= 0 ? number : null;
};
var text = (value) => {
  if (typeof value !== "string")
    return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
var firstNumber = (...values) => {
  for (const value of values) {
    const number = nonnegative(value);
    if (number !== null)
      return number;
  }
  return null;
};
var gb = (value) => {
  const bytes = nonnegative(value);
  return bytes === null ? null : bytes / 1e9;
};
var emptyFields = (sampledAt) => ({
  message: null,
  runtime: null,
  backendID: null,
  modelID: null,
  phase: "unknown",
  apiKeyRequired: null,
  sessionAveragePrefillTPS: null,
  liveDecodeTPS: null,
  livePrefillTPS: null,
  sessionAverageDecodeTPS: null,
  sessionCacheEfficiencyPercent: null,
  promptTokens: null,
  cachedTokens: null,
  completionTokens: null,
  prefillProgress: null,
  elapsedSeconds: null,
  activeRequests: 0,
  queuedRequests: 0,
  contextWindow: null,
  memory: null,
  sessionBank: null,
  scheduler: null,
  lifetime: null,
  memoryPressureLevel: null,
  memoryPressureSource: null,
  sampledAt
});
var unavailableTelemetry = (reason, message = null, sampledAt = Date.now()) => ({
  available: false,
  reason,
  ...emptyFields(sampledAt),
  message: text(message)
});
var arrayOfObjects = (value) => Array.isArray(value) ? value.map(asObject).filter((item) => item !== null) : [];
var matchingModel = (models, preferredModel) => models.find((model) => (nonnegative(model.active_requests) ?? 0) > 0 || model.is_loading === true) ?? (preferredModel === null ? undefined : models.find((model) => model.id === preferredModel)) ?? models[0] ?? null;
var normalizeFlights = (model, lookup) => {
  if (model === null) {
    return {
      phase: "idle",
      message: null,
      liveDecodeTPS: null,
      livePrefillTPS: null,
      promptTokens: null,
      cachedTokens: null,
      completionTokens: null,
      prefillProgress: null,
      elapsedSeconds: null,
      processingElapsed: null
    };
  }
  let summary = {
    phase: model.is_loading === true ? "processing" : "idle",
    message: model.is_loading === true ? "Loading the model · no token speed yet" : null,
    liveDecodeTPS: null,
    livePrefillTPS: null,
    promptTokens: null,
    cachedTokens: null,
    completionTokens: null,
    prefillProgress: null,
    elapsedSeconds: null,
    processingElapsed: nonnegative(model.loading_elapsed_seconds)
  };
  const waiting = arrayOfObjects(model.waiting);
  for (const prefill of arrayOfObjects(model.prefilling)) {
    const requestID = text(prefill.request_id);
    const waitingRequest = requestID === null ? null : waiting.find((candidate) => candidate.request_id === requestID) ?? null;
    const matchesLookup = requestID !== null && requestID === text(lookup.request_id);
    const total = nonnegative(prefill.total);
    const done = nonnegative(prefill.processed);
    const promptTokens = firstNumber(prefill.prompt_tokens, waitingRequest?.prompt_tokens, matchesLookup ? lookup.prompt_tokens : null);
    const cachedTokens = firstNumber(prefill.cached_tokens, matchesLookup ? lookup.reused_kv_tokens : null);
    const progress = done !== null && total !== null ? Math.min(1, done / Math.max(1, total)) : null;
    summary = {
      ...summary,
      phase: "prefill",
      message: prefill.progress_stale === true ? "Prefill is active · waiting for fresh progress" : summary.message,
      livePrefillTPS: firstNumber(prefill.speed),
      promptTokens,
      cachedTokens,
      prefillProgress: progress,
      elapsedSeconds: firstNumber(prefill.elapsed)
    };
  }
  for (const generating of arrayOfObjects(model.generating)) {
    const generated = nonnegative(generating.generated_tokens) ?? 0;
    const elapsed = nonnegative(generating.elapsed_seconds) ?? 0;
    const age = nonnegative(generating.last_activity_age_seconds);
    const requestID = text(generating.request_id);
    const matchesLookup = requestID !== null && requestID === text(lookup.request_id);
    const promptTokens = firstNumber(generating.prompt_tokens, matchesLookup ? lookup.prompt_tokens : null);
    const cachedTokens = firstNumber(matchesLookup ? lookup.reused_kv_tokens : null);
    if (generated <= 0 || elapsed <= 0 || age === null || age > 5) {
      summary = {
        ...summary,
        phase: "processing",
        message: generated > 0 ? "No recent output · request still active" : "Waiting for the first output token",
        processingElapsed: nonnegative(generating.elapsed_seconds),
        promptTokens,
        cachedTokens
      };
      continue;
    }
    summary = {
      ...summary,
      phase: "decode",
      message: null,
      liveDecodeTPS: firstNumber(generating.tokens_per_second),
      promptTokens,
      cachedTokens,
      completionTokens: generated,
      elapsedSeconds: elapsed
    };
  }
  if (arrayOfObjects(model.activities).length > 0) {
    summary = {
      ...summary,
      phase: "processing",
      message: "Runtime active · detailed token progress unavailable"
    };
  }
  if ((nonnegative(model.active_requests) ?? 0) > 0 && summary.phase === "idle") {
    summary = { ...summary, phase: "processing" };
  }
  return summary;
};
var normalizeWaiting = (models, active) => {
  const reported = firstNumber(active.total_waiting_requests, ...models.map((model) => model.waiting_requests)) ?? 0;
  let overlap = 0;
  for (const model of models) {
    const activeIDs = new Set;
    for (const key of ["prefilling", "generating", "activities"]) {
      for (const item of arrayOfObjects(model[key])) {
        const id = text(item.request_id);
        if (id !== null)
          activeIDs.add(id);
      }
    }
    for (const item of arrayOfObjects(model.waiting)) {
      const id = text(item.request_id);
      if (id !== null && activeIDs.has(id))
        overlap += 1;
    }
  }
  return Math.max(0, reported - overlap);
};
var normalizeMemory = (active, model, cache) => ({
  activeGB: gb(active.model_memory_used),
  peakGB: null,
  modelGB: gb(model?.actual_size),
  cacheGB: gb(cache.hot_cache_size_bytes)
});
var normalizeSessionBank = (cache, lookup) => {
  const cold = asObject(cache.cold_tier);
  return {
    hot: {
      totalGB: gb(cache.hot_cache_size_bytes),
      entries: firstNumber(cache.hot_cache_entries)
    },
    cold: cold === null ? null : {
      totalGB: gb(cold.physical_bytes),
      entries: firstNumber(cold.entries)
    },
    lastMissReason: text(lookup.reason)
  };
};
var normalizeLifetime = (stats) => ({
  requestsTotal: firstNumber(stats.total_requests),
  promptTokensTotal: firstNumber(stats.total_prompt_tokens),
  completionTokensTotal: firstNumber(stats.total_completion_tokens),
  cachedTokensTotal: firstNumber(stats.total_cached_tokens),
  uptimeSeconds: firstNumber(stats.uptime_seconds)
});
var normalizeOmlxTelemetry = (statsValue, activityValue, contextWindows = new Map, preferredModel = null, sampledAt = Date.now()) => {
  const stats = asObject(statsValue);
  const savedActive = stats === null ? null : asObject(stats.active_models);
  if (stats === null || savedActive === null || asObject(stats.engines) === null || finite(stats.total_requests) === null) {
    return null;
  }
  let active = savedActive;
  if (activityValue !== null) {
    const activity = asObject(activityValue);
    const freshActive = activity === null ? null : asObject(activity.active_models);
    if (freshActive === null)
      return null;
    active = freshActive;
  }
  const models = arrayOfObjects(active.models);
  if (models.length === 0)
    return null;
  const model = matchingModel(models, preferredModel);
  const modelID = text(model?.id);
  const cache = asObject(stats.runtime_cache) ?? {};
  const modelCache = arrayOfObjects(cache.models).find((candidate) => text(candidate.id) === modelID) ?? {};
  const lookup = asObject(modelCache.last_prefix_lookup) ?? {};
  const flight = normalizeFlights(model, lookup);
  const activeRequests = firstNumber(active.total_active_requests, ...models.map((item) => item.active_requests)) ?? 0;
  const queuedRequests = normalizeWaiting(models, active);
  const pressure = asObject(active.memory_pressure);
  const pressureName = text(pressure?.pressure_level);
  const pressureLevel = pressure?.enabled === true ? pressureName === "critical" || pressureName === "hard" ? 3 : pressureName === "soft" ? 2 : pressureName === "ok" ? 1 : null : null;
  const physicalBytes = firstNumber(cache.total_size_bytes);
  const sidecarBytes = arrayOfObjects(cache.models).reduce((total, item) => total + (firstNumber(asObject(item.gdn_staging)?.sidecar_size_bytes) ?? 0), 0);
  const coldTier = asObject(cache.cold_tier) ?? {
    physical_bytes: physicalBytes === null ? null : physicalBytes + sidecarBytes,
    entries: cache.total_num_files
  };
  const sessionBank = normalizeSessionBank({ ...cache, cold_tier: coldTier }, lookup);
  const scheduler = {
    mode: "oMLX",
    preset: null,
    lane: null,
    queuedRequests
  };
  const memory = normalizeMemory(active, model, cache);
  return {
    available: true,
    reason: null,
    message: flight.message,
    runtime: "omlx",
    backendID: "omlx",
    modelID,
    phase: flight.phase === "idle" && queuedRequests > 0 ? "queued" : flight.phase,
    apiKeyRequired: true,
    sessionAveragePrefillTPS: firstNumber(stats.avg_prefill_tps),
    liveDecodeTPS: flight.liveDecodeTPS,
    livePrefillTPS: flight.livePrefillTPS,
    sessionAverageDecodeTPS: firstNumber(stats.avg_generation_tps),
    sessionCacheEfficiencyPercent: firstNumber(stats.cache_efficiency),
    promptTokens: flight.promptTokens,
    cachedTokens: flight.cachedTokens,
    completionTokens: flight.completionTokens,
    prefillProgress: flight.prefillProgress,
    elapsedSeconds: flight.elapsedSeconds,
    activeRequests,
    queuedRequests,
    contextWindow: modelID === null ? null : contextWindows.get(modelID) ?? null,
    memory,
    sessionBank,
    scheduler,
    lifetime: normalizeLifetime(stats),
    memoryPressureLevel: pressureLevel,
    memoryPressureSource: pressureLevel === null ? null : "oMLX process memory guard (not macOS pressure)",
    sampledAt
  };
};

// service/config.ts
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
var asObject2 = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
var nonempty = (value) => {
  if (typeof value !== "string")
    return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
var readJson = async (path, readText) => {
  const content = await readText(path);
  if (content === null)
    return null;
  try {
    return asObject2(JSON.parse(content));
  } catch {
    return null;
  }
};
var defaultReadText = async (path) => {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
};
var pathsForHome = (home, env = process.env) => {
  const configHome = nonempty(env.XDG_CONFIG_HOME) ?? join(home, ".config");
  return {
    openCode: join(configHome, "opencode", "opencode.json"),
    omlx: join(home, ".omlx", "settings.json"),
    auth: join(home, ".local", "share", "opencode", "auth.json")
  };
};
var parseLoopbackOrigin = (value, stripPath = false) => {
  const candidate = nonempty(value);
  if (candidate === null)
    return null;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.port.length === 0)
    return null;
  if (url.username || url.password || url.search || url.hash)
    return null;
  if (!stripPath && url.pathname !== "" && url.pathname !== "/")
    return null;
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
};
var providerOptions = (config) => {
  const providers = asObject2(config?.provider);
  const omlx = asObject2(providers?.omlx);
  return asObject2(omlx?.options);
};
var selectedOmlxModel = (config, env) => {
  const configured = nonempty(env.OMLX_TELEMETRY_MODEL);
  if (configured !== null)
    return configured;
  const model = nonempty(config?.model);
  if (model === null)
    return null;
  const [provider, ...rest] = model.split("/");
  return provider === "omlx" && rest.length > 0 ? rest.join("/") : null;
};
var nativeEndpoint = (settings) => {
  const server = asObject2(settings?.server);
  const host = nonempty(server?.host) ?? "127.0.0.1";
  const port = typeof server?.port === "number" && Number.isInteger(server.port) ? server.port : null;
  return port !== null && port >= 1 && port <= 65535 ? `http://${host}:${port}` : null;
};
var resolveOmlxConfig = async ({ env = process.env, home = env.HOME ?? homedir(), readText = defaultReadText } = {}) => {
  const paths = pathsForHome(home, env);
  const [openCode, omlx, auth] = await Promise.all([
    readJson(paths.openCode, readText),
    readJson(paths.omlx, readText),
    readJson(paths.auth, readText)
  ]);
  const providerBase = providerOptions(openCode)?.baseURL;
  const envBase = nonempty(env.OMLX_TELEMETRY_BASE_URL);
  const baseCandidate = envBase ?? (typeof providerBase === "string" ? providerBase : nativeEndpoint(omlx));
  const baseURL = parseLoopbackOrigin(baseCandidate, envBase === null && typeof providerBase === "string");
  const error = baseCandidate === null ? "No oMLX endpoint was found in OpenCode or oMLX configuration." : baseURL === null ? "The saved oMLX endpoint is not a numeric loopback HTTP origin." : null;
  const envKey = nonempty(env.OMLX_TELEMETRY_API_KEY);
  const authProvider = asObject2(asObject2(auth?.omlx));
  const authKey = authProvider?.type === "api" ? nonempty(authProvider.key) : null;
  return {
    baseURL,
    apiKey: envKey ?? authKey,
    preferredModel: selectedOmlxModel(openCode, env),
    error
  };
};

// service/omlx-client.ts
class OmlxFailure extends Error {
  reason;
  constructor(reason, message) {
    super(message);
    this.name = "OmlxFailure";
    this.reason = reason;
  }
}
var asObject3 = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
var nonnegative2 = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
var extractCookie = (value) => {
  if (value === null)
    return null;
  const match = /(?:^|,\s*)omlx_admin_session=([^;,]+)/i.exec(value);
  return match?.[1] ?? null;
};
var responseIsRedirect = (status) => status >= 300 && status < 400;
var requestJSON = async ({
  url,
  init,
  fetchImpl
}) => {
  const controller = new AbortController;
  const timer = setTimeout(() => controller.abort(), 3000);
  let response;
  try {
    response = await fetchImpl(url.toString(), {
      ...init,
      redirect: "manual",
      signal: controller.signal
    });
  } catch {
    throw new OmlxFailure("runtime_unreachable", "The oMLX runtime did not answer.");
  } finally {
    clearTimeout(timer);
  }
  if (!response || responseIsRedirect(response.status) || response.url !== "" && response.url !== url.toString()) {
    throw new OmlxFailure("runtime_unreachable", "The oMLX runtime returned an unsafe response.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new OmlxFailure("authentication_failed", "The oMLX runtime rejected its saved credential.");
  }
  if (response.status !== 200) {
    throw new OmlxFailure("runtime_unreachable", `The oMLX runtime returned HTTP ${response.status}.`);
  }
  let body = null;
  try {
    body = asObject3(await response.json());
  } catch {
    throw new OmlxFailure("runtime_unreachable", "The oMLX runtime returned invalid JSON.");
  }
  return {
    status: response.status,
    body,
    cookie: extractCookie(response.headers.get("set-cookie"))
  };
};
var resettableConfig = (config) => `${config.baseURL?.toString() ?? ""}\x00${config.apiKey ?? ""}`;
var isHealthy = (body) => {
  const pool = asObject3(body?.engine_pool);
  return body?.status === "healthy" && nonnegative2(pool?.model_count) !== null;
};
var parseContextWindows = (body) => {
  const result = new Map;
  const models = Array.isArray(body?.models) ? body.models : [];
  for (const item of models) {
    const model = asObject3(item);
    const id = typeof model?.id === "string" ? model.id : null;
    const limit = nonnegative2(model?.max_context_window);
    if (id !== null && limit !== null && limit > 0)
      result.set(id, Math.trunc(limit));
  }
  return result;
};

class OmlxClient {
  fetchImpl;
  readConfig;
  now;
  configKey = "";
  cookie = null;
  stats = null;
  statsAt = 0;
  identityAt = Number.NEGATIVE_INFINITY;
  modelStatusAt = Number.NEGATIVE_INFINITY;
  contextWindows = new Map;
  constructor({ fetchImpl = globalThis.fetch, readConfig = resolveOmlxConfig, now = () => Date.now() } = {}) {
    this.fetchImpl = fetchImpl;
    this.readConfig = readConfig;
    this.now = now;
  }
  async snapshot() {
    const config = await this.readConfig();
    if (config.baseURL === null) {
      return unavailableTelemetry("runtime_unreachable", config.error);
    }
    if (config.apiKey === null) {
      return unavailableTelemetry("authentication_failed", "No oMLX API credential was found in OpenCode auth.");
    }
    const key = resettableConfig(config);
    if (key !== this.configKey) {
      this.configKey = key;
      this.cookie = null;
      this.stats = null;
      this.statsAt = 0;
      this.identityAt = Number.NEGATIVE_INFINITY;
      this.modelStatusAt = Number.NEGATIVE_INFINITY;
      this.contextWindows = new Map;
    }
    try {
      const now = this.now();
      if (now - this.identityAt >= 300000) {
        await this.verifyIdentity(config.baseURL);
        this.identityAt = now;
      }
      if (this.cookie === null)
        this.cookie = await this.login(config.baseURL, config.apiKey);
      if (now - this.modelStatusAt >= 60000) {
        this.contextWindows = await this.readModelStatus(config.baseURL, config.apiKey);
        this.modelStatusAt = now;
      }
      if (this.stats === null || now - this.statsAt >= 3000) {
        this.stats = await this.readStats(config.baseURL, this.cookie);
        this.statsAt = now;
      }
      const activity = await this.readActivity(config.baseURL, this.cookie);
      const normalized = normalizeOmlxTelemetry(this.stats, activity, this.contextWindows, config.preferredModel, now);
      if (normalized === null) {
        throw new OmlxFailure("runtime_unreachable", "oMLX returned an unexpected telemetry shape.");
      }
      return normalized;
    } catch (error) {
      if (error instanceof OmlxFailure) {
        if (error.reason === "authentication_failed")
          this.cookie = null;
        return unavailableTelemetry(error.reason, error.message);
      }
      this.cookie = null;
      this.stats = null;
      return unavailableTelemetry("runtime_unreachable", "The oMLX telemetry request failed.");
    }
  }
  async capabilities() {
    const config = await this.readConfig();
    return { configured: config.baseURL !== null && config.apiKey !== null, model: config.preferredModel };
  }
  async verifyIdentity(baseURL) {
    const response = await requestJSON({
      url: new URL("/health", baseURL),
      fetchImpl: this.fetchImpl,
      init: { method: "GET", headers: { Accept: "application/json" } }
    });
    if (!isHealthy(response.body)) {
      throw new OmlxFailure("runtime_unreachable", "The service answered, but it did not identify as oMLX.");
    }
  }
  async login(baseURL, apiKey) {
    const response = await requestJSON({
      url: new URL("/admin/api/login", baseURL),
      fetchImpl: this.fetchImpl,
      init: {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, remember: false })
      }
    });
    if (response.cookie === null) {
      throw new OmlxFailure("authentication_failed", "oMLX login did not return a session.");
    }
    return response.cookie;
  }
  async readModelStatus(baseURL, apiKey) {
    try {
      const response = await requestJSON({
        url: new URL("/v1/models/status", baseURL),
        fetchImpl: this.fetchImpl,
        init: { method: "GET", headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` } }
      });
      return parseContextWindows(response.body);
    } catch {
      return this.contextWindows;
    }
  }
  async readStats(baseURL, cookie) {
    const response = await requestJSON({
      url: new URL("/admin/api/stats?scope=session", baseURL),
      fetchImpl: this.fetchImpl,
      init: { method: "GET", headers: { Accept: "application/json", Cookie: `omlx_admin_session=${cookie}` } }
    });
    if (response.body === null)
      throw new OmlxFailure("runtime_unreachable", "oMLX stats were empty.");
    return response.body;
  }
  async readActivity(baseURL, cookie) {
    const response = await requestJSON({
      url: new URL("/admin/api/activity", baseURL),
      fetchImpl: this.fetchImpl,
      init: { method: "GET", headers: { Accept: "application/json", Cookie: `omlx_admin_session=${cookie}` } }
    });
    if (response.body === null)
      throw new OmlxFailure("runtime_unreachable", "oMLX activity was empty.");
    return response.body;
  }
}

// service/main.ts
var port = Number(process.env.OPENCHAMBER_SERVICE_PORT);
var token = process.env.OPENCHAMBER_SERVICE_TOKEN ?? "";
if (!Number.isInteger(port) || port < 1 || port > 65535 || token.length === 0) {
  console.error("OpenChamber service port and token are required.");
  process.exit(1);
}
var json = (response, status, body) => {
  response.statusCode = status;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
};
var authorized = (request) => request.headers.authorization === `Bearer ${token}`;
var client = new OmlxClient;
var server = http.createServer(async (request, response) => {
  if (!authorized(request)) {
    json(response, 401, { error: "unauthorized" });
    return;
  }
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/health") {
    json(response, 200, { status: "healthy" });
    return;
  }
  if (request.method === "GET" && url.pathname === "/capabilities") {
    json(response, 200, await client.capabilities());
    return;
  }
  if (request.method === "GET" && url.pathname === "/snapshot") {
    json(response, 200, await client.snapshot());
    return;
  }
  json(response, 404, { error: "not_found" });
});
server.on("error", (error) => {
  console.error(`oMLX Telemetry service stopped: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
var stop = () => {
  server.close(() => process.exit(0));
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
server.listen(port, "127.0.0.1");
