export const TELEMETRY_PHASES = [
  'connecting',
  'reconnecting',
  'offline',
  'notLoaded',
  'idle',
  'queued',
  'prefill',
  'decode',
  'processing',
  'unknown',
] as const;

export type TelemetryPhase = (typeof TELEMETRY_PHASES)[number];

export const TELEMETRY_REASONS = [
  'feature_disabled',
  'runtime_unreachable',
  'authentication_failed',
  'unparseable_snapshot',
  'unsupported_contract',
] as const;

export type TelemetryReason = (typeof TELEMETRY_REASONS)[number];

export type TelemetryMemory = {
  activeGB: number | null;
  peakGB: number | null;
  modelGB: number | null;
  cacheGB: number | null;
};

export type TelemetryCacheTier = {
  totalGB: number | null;
  entries: number | null;
};

export type TelemetrySessionBank = {
  hot: TelemetryCacheTier | null;
  cold: TelemetryCacheTier | null;
  lastMissReason: string | null;
};

export type TelemetryScheduler = {
  mode: string | null;
  preset: string | null;
  lane: string | null;
  queuedRequests: number | null;
};

export type TelemetryLifetime = {
  requestsTotal: number | null;
  promptTokensTotal: number | null;
  completionTokensTotal: number | null;
  cachedTokensTotal: number | null;
  uptimeSeconds: number | null;
};

type TelemetryFields = {
  message: string | null;
  runtime: 'omlx' | null;
  backendID: 'omlx' | null;
  modelID: string | null;
  phase: TelemetryPhase;
  apiKeyRequired: boolean | null;
  sessionAveragePrefillTPS: number | null;
  liveDecodeTPS: number | null;
  livePrefillTPS: number | null;
  sessionAverageDecodeTPS: number | null;
  sessionCacheEfficiencyPercent: number | null;
  promptTokens: number | null;
  cachedTokens: number | null;
  completionTokens: number | null;
  prefillProgress: number | null;
  elapsedSeconds: number | null;
  activeRequests: number;
  queuedRequests: number;
  contextWindow: number | null;
  memory: TelemetryMemory | null;
  sessionBank: TelemetrySessionBank | null;
  scheduler: TelemetryScheduler | null;
  lifetime: TelemetryLifetime | null;
  memoryPressureLevel: number | null;
  memoryPressureSource: string | null;
  sampledAt: number;
};

export type AvailableTelemetry = TelemetryFields & {
  available: true;
  reason: null;
};

export type UnavailableTelemetry = TelemetryFields & {
  available: false;
  reason: TelemetryReason;
};

export type TelemetrySnapshot = AvailableTelemetry | UnavailableTelemetry;

type JsonObject = { readonly [key: string]: unknown };

const asObject = (value: unknown): JsonObject | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : null
);

const finite = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const nonnegative = (value: unknown): number | null => {
  const number = finite(value);
  return number !== null && number >= 0 ? number : null;
};

const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const bool = (value: unknown): boolean | null => (
  value === true ? true : value === false ? false : null
);

const firstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const number = nonnegative(value);
    if (number !== null) return number;
  }
  return null;
};

const gb = (value: unknown): number | null => {
  const bytes = nonnegative(value);
  return bytes === null ? null : bytes / 1_000_000_000;
};

const normalizePhase = (value: unknown): TelemetryPhase => {
  const candidate = text(value);
  return candidate !== null && (TELEMETRY_PHASES as readonly string[]).includes(candidate)
    ? candidate as TelemetryPhase
    : 'unknown';
};

const emptyFields = (sampledAt: number): TelemetryFields => ({
  message: null,
  runtime: null,
  backendID: null,
  modelID: null,
  phase: 'unknown',
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
  sampledAt,
});

export const unavailableTelemetry = (
  reason: TelemetryReason,
  message: string | null = null,
  sampledAt = Date.now(),
): UnavailableTelemetry => ({
  available: false,
  reason,
  ...emptyFields(sampledAt),
  message: text(message),
});

const arrayOfObjects = (value: unknown): JsonObject[] => (
  Array.isArray(value) ? value.map(asObject).filter((item): item is JsonObject => item !== null) : []
);

const matchingModel = (models: JsonObject[], preferredModel: string | null): JsonObject | null => (
  models.find((model) => (nonnegative(model.active_requests) ?? 0) > 0 || model.is_loading === true)
    ?? (preferredModel === null ? undefined : models.find((model) => model.id === preferredModel))
    ?? models[0]
    ?? null
);

type FlightSummary = {
  phase: TelemetryPhase;
  message: string | null;
  liveDecodeTPS: number | null;
  livePrefillTPS: number | null;
  promptTokens: number | null;
  cachedTokens: number | null;
  completionTokens: number | null;
  prefillProgress: number | null;
  elapsedSeconds: number | null;
  processingElapsed: number | null;
};

const normalizeFlights = (model: JsonObject | null, lookup: JsonObject): FlightSummary => {
  if (model === null) {
    return {
      phase: 'idle',
      message: null,
      liveDecodeTPS: null,
      livePrefillTPS: null,
      promptTokens: null,
      cachedTokens: null,
      completionTokens: null,
      prefillProgress: null,
      elapsedSeconds: null,
      processingElapsed: null,
    };
  }

  let summary: FlightSummary = {
    phase: model.is_loading === true ? 'processing' : 'idle',
    message: model.is_loading === true ? 'Loading the model · no token speed yet' : null,
    liveDecodeTPS: null,
    livePrefillTPS: null,
    promptTokens: null,
    cachedTokens: null,
    completionTokens: null,
    prefillProgress: null,
    elapsedSeconds: null,
    processingElapsed: nonnegative(model.loading_elapsed_seconds),
  };
  const waiting = arrayOfObjects(model.waiting);

  for (const prefill of arrayOfObjects(model.prefilling)) {
    const requestID = text(prefill.request_id);
    const waitingRequest = requestID === null
      ? null
      : waiting.find((candidate) => candidate.request_id === requestID) ?? null;
    const matchesLookup = requestID !== null && requestID === text(lookup.request_id);
    const total = nonnegative(prefill.total);
    const done = nonnegative(prefill.processed);
    const promptTokens = firstNumber(prefill.prompt_tokens, waitingRequest?.prompt_tokens, matchesLookup ? lookup.prompt_tokens : null);
    const cachedTokens = firstNumber(prefill.cached_tokens, matchesLookup ? lookup.reused_kv_tokens : null);
    const progress = done !== null && total !== null ? Math.min(1, done / Math.max(1, total)) : null;
    summary = {
      ...summary,
      phase: 'prefill',
      message: prefill.progress_stale === true ? 'Prefill is active · waiting for fresh progress' : summary.message,
      livePrefillTPS: firstNumber(prefill.speed),
      promptTokens,
      cachedTokens,
      prefillProgress: progress,
      elapsedSeconds: firstNumber(prefill.elapsed),
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
        phase: 'processing',
        message: generated > 0 ? 'No recent output · request still active' : 'Waiting for the first output token',
        processingElapsed: nonnegative(generating.elapsed_seconds),
        promptTokens,
        cachedTokens,
      };
      continue;
    }
    summary = {
      ...summary,
      phase: 'decode',
      message: null,
      liveDecodeTPS: firstNumber(generating.tokens_per_second),
      promptTokens,
      cachedTokens,
      completionTokens: generated,
      elapsedSeconds: elapsed,
    };
  }

  if (arrayOfObjects(model.activities).length > 0) {
    summary = {
      ...summary,
      phase: 'processing',
      message: 'Runtime active · detailed token progress unavailable',
    };
  }
  if ((nonnegative(model.active_requests) ?? 0) > 0 && summary.phase === 'idle') {
    summary = { ...summary, phase: 'processing' };
  }
  return summary;
};

const normalizeWaiting = (models: JsonObject[], active: JsonObject): number => {
  const reported = firstNumber(
    active.total_waiting_requests,
    ...models.map((model) => model.waiting_requests),
  ) ?? 0;
  let overlap = 0;
  for (const model of models) {
    const activeIDs = new Set<string>();
    for (const key of ['prefilling', 'generating', 'activities']) {
      for (const item of arrayOfObjects(model[key])) {
        const id = text(item.request_id);
        if (id !== null) activeIDs.add(id);
      }
    }
    for (const item of arrayOfObjects(model.waiting)) {
      const id = text(item.request_id);
      if (id !== null && activeIDs.has(id)) overlap += 1;
    }
  }
  return Math.max(0, reported - overlap);
};

const normalizeMemory = (active: JsonObject, model: JsonObject | null, cache: JsonObject): TelemetryMemory => ({
  activeGB: gb(active.model_memory_used),
  peakGB: null,
  modelGB: gb(model?.actual_size),
  cacheGB: gb(cache.hot_cache_size_bytes),
});

const normalizeSessionBank = (cache: JsonObject, lookup: JsonObject): TelemetrySessionBank => {
  const cold = asObject(cache.cold_tier);
  return {
    hot: {
      totalGB: gb(cache.hot_cache_size_bytes),
      entries: firstNumber(cache.hot_cache_entries),
    },
    cold: cold === null ? null : {
      totalGB: gb(cold.physical_bytes),
      entries: firstNumber(cold.entries),
    },
    lastMissReason: text(lookup.reason),
  };
};

const normalizeLifetime = (stats: JsonObject): TelemetryLifetime => ({
  requestsTotal: firstNumber(stats.total_requests),
  promptTokensTotal: firstNumber(stats.total_prompt_tokens),
  completionTokensTotal: firstNumber(stats.total_completion_tokens),
  cachedTokensTotal: firstNumber(stats.total_cached_tokens),
  uptimeSeconds: firstNumber(stats.uptime_seconds),
});

/**
 * Convert the read-only oMLX dashboard payloads into the extension's small,
 * browser-safe scalar contract. Request IDs, prompts, and raw payloads never
 * appear in the returned object.
 */
export const normalizeOmlxTelemetry = (
  statsValue: unknown,
  activityValue: unknown | null,
  contextWindows: ReadonlyMap<string, number> = new Map(),
  preferredModel: string | null = null,
  sampledAt = Date.now(),
): AvailableTelemetry | null => {
  const stats = asObject(statsValue);
  const savedActive = stats === null ? null : asObject(stats.active_models);
  if (stats === null || savedActive === null || asObject(stats.engines) === null || finite(stats.total_requests) === null) {
    return null;
  }
  let active = savedActive;
  if (activityValue !== null) {
    const activity = asObject(activityValue);
    const freshActive = activity === null ? null : asObject(activity.active_models);
    if (freshActive === null) return null;
    active = freshActive;
  }

  const models = arrayOfObjects(active.models);
  if (models.length === 0) return null;
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
  const pressureLevel = pressure?.enabled === true
    ? pressureName === 'critical' || pressureName === 'hard' ? 3 : pressureName === 'soft' ? 2 : pressureName === 'ok' ? 1 : null
    : null;

  const physicalBytes = firstNumber(cache.total_size_bytes);
  const sidecarBytes = arrayOfObjects(cache.models).reduce(
    (total, item) => total + (firstNumber(asObject(item.gdn_staging)?.sidecar_size_bytes) ?? 0),
    0,
  );
  const coldTier = asObject(cache.cold_tier) ?? {
    physical_bytes: physicalBytes === null ? null : physicalBytes + sidecarBytes,
    entries: cache.total_num_files,
  };
  const sessionBank = normalizeSessionBank({ ...cache, cold_tier: coldTier }, lookup);
  const scheduler: TelemetryScheduler = {
    mode: 'oMLX',
    preset: null,
    lane: null,
    queuedRequests,
  };
  const memory = normalizeMemory(active, model, cache);

  return {
    available: true,
    reason: null,
    message: flight.message,
    runtime: 'omlx',
    backendID: 'omlx',
    modelID,
    phase: flight.phase === 'idle' && queuedRequests > 0 ? 'queued' : flight.phase,
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
    memoryPressureSource: pressureLevel === null ? null : 'oMLX process memory guard (not macOS pressure)',
    sampledAt,
  };
};

const normalizeMemoryFromPanel = (value: unknown): TelemetryMemory | null => {
  const memory = asObject(value);
  if (memory === null) return null;
  return {
    activeGB: nonnegative(memory.activeGB),
    peakGB: nonnegative(memory.peakGB),
    modelGB: nonnegative(memory.modelGB),
    cacheGB: nonnegative(memory.cacheGB),
  };
};

const normalizeSessionBankFromPanel = (value: unknown): TelemetrySessionBank | null => {
  const bank = asObject(value);
  if (bank === null) return null;
  const tier = (entry: unknown): TelemetryCacheTier | null => {
    const object = asObject(entry);
    return object === null ? null : { totalGB: nonnegative(object.totalGB), entries: nonnegative(object.entries) };
  };
  return {
    hot: tier(bank.hot),
    cold: tier(bank.cold),
    lastMissReason: text(bank.lastMissReason),
  };
};

const normalizeSchedulerFromPanel = (value: unknown): TelemetryScheduler | null => {
  const scheduler = asObject(value);
  if (scheduler === null) return null;
  return {
    mode: text(scheduler.mode),
    preset: text(scheduler.preset),
    lane: text(scheduler.lane),
    queuedRequests: nonnegative(scheduler.queuedRequests),
  };
};

const normalizeLifetimeFromPanel = (value: unknown): TelemetryLifetime | null => {
  const lifetime = asObject(value);
  if (lifetime === null) return null;
  return {
    requestsTotal: nonnegative(lifetime.requestsTotal),
    promptTokensTotal: nonnegative(lifetime.promptTokensTotal),
    completionTokensTotal: nonnegative(lifetime.completionTokensTotal),
    cachedTokensTotal: nonnegative(lifetime.cachedTokensTotal),
    uptimeSeconds: nonnegative(lifetime.uptimeSeconds),
  };
};

/** Validate the service response before any value enters the DOM. */
export const parseTelemetrySnapshot = (value: unknown): TelemetrySnapshot => {
  const record = asObject(value);
  const sampledAt = finite(record?.sampledAt) ?? Date.now();
  if (record?.available !== true) {
    const reason = text(record?.reason);
    const safeReason = reason !== null && (TELEMETRY_REASONS as readonly string[]).includes(reason)
      ? reason as TelemetryReason
      : 'unparseable_snapshot';
    return unavailableTelemetry(safeReason, text(record?.message), sampledAt);
  }
  const active = nonnegative(record.activeRequests) ?? 0;
  const queued = nonnegative(record.queuedRequests) ?? 0;
  return {
    available: true,
    reason: null,
    message: text(record.message),
    runtime: text(record.runtime) === 'omlx' ? 'omlx' : null,
    backendID: text(record.backendID) === 'omlx' ? 'omlx' : null,
    modelID: text(record.modelID),
    phase: normalizePhase(record.phase),
    apiKeyRequired: bool(record.apiKeyRequired),
    sessionAveragePrefillTPS: nonnegative(record.sessionAveragePrefillTPS),
    liveDecodeTPS: nonnegative(record.liveDecodeTPS),
    livePrefillTPS: nonnegative(record.livePrefillTPS),
    sessionAverageDecodeTPS: nonnegative(record.sessionAverageDecodeTPS),
    sessionCacheEfficiencyPercent: nonnegative(record.sessionCacheEfficiencyPercent),
    promptTokens: nonnegative(record.promptTokens),
    cachedTokens: nonnegative(record.cachedTokens),
    completionTokens: nonnegative(record.completionTokens),
    prefillProgress: nonnegative(record.prefillProgress),
    elapsedSeconds: nonnegative(record.elapsedSeconds),
    activeRequests: active,
    queuedRequests: queued,
    contextWindow: nonnegative(record.contextWindow),
    memory: normalizeMemoryFromPanel(record.memory),
    sessionBank: normalizeSessionBankFromPanel(record.sessionBank),
    scheduler: normalizeSchedulerFromPanel(record.scheduler),
    lifetime: normalizeLifetimeFromPanel(record.lifetime),
    memoryPressureLevel: nonnegative(record.memoryPressureLevel),
    memoryPressureSource: text(record.memoryPressureSource),
    sampledAt,
  };
};

export const __test__ = {
  asObject,
  finite,
  nonnegative,
  normalizeFlights,
  normalizeWaiting,
  normalizePhase,
};
