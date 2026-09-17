import { describe, expect, it } from 'bun:test';
import { normalizeOmlxTelemetry, parseTelemetrySnapshot } from './telemetry.ts';

type RawModel = {
  id: string;
  active_requests: number;
  waiting_requests: number;
  prefilling: Array<Record<string, unknown>>;
  generating: Array<Record<string, unknown>>;
  waiting: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
  actual_size: number;
};

type StatsOptions = {
  active_requests?: number;
  prefilling?: Array<Record<string, unknown>>;
  generating?: Array<Record<string, unknown>>;
  waiting?: Array<Record<string, unknown>>;
  total_waiting_requests?: number;
};

const stats = (options: StatsOptions = {}) => {
  const model: RawModel = {
    id: 'mlx-community/Qwen3.8-27B-Instruct-4bit',
    active_requests: options.active_requests ?? 1,
    waiting_requests: 0,
    prefilling: options.prefilling ?? [],
    generating: options.generating ?? [{
      request_id: 'request-private',
      generated_tokens: 64,
      elapsed_seconds: 2.6,
      tokens_per_second: 24.6,
      last_activity_age_seconds: 0,
      prompt_tokens: 1024,
    }],
    waiting: options.waiting ?? [],
    activities: [],
    actual_size: 16_900_000_000,
  };
  return {
  engines: { mlx: 1 },
  total_requests: 142,
  total_prompt_tokens: 218_000,
  total_completion_tokens: 92_500,
  total_cached_tokens: 380_000,
  avg_prefill_tps: 184.5,
  avg_generation_tps: 22.1,
  cache_efficiency: 63.3,
  uptime_seconds: 5_220,
  active_models: {
    models: [{
      ...model,
    }],
    model_memory_used: 18_400_000_000,
    memory_pressure: { enabled: true, pressure_level: 'ok' },
    total_active_requests: 1,
    total_waiting_requests: options.total_waiting_requests ?? 0,
  },
  runtime_cache: {
    hot_cache_size_bytes: 3_400_000_000,
    hot_cache_entries: 7,
    total_size_bytes: 96_000_000_000,
    total_num_files: 188,
    models: [{
      id: 'mlx-community/Qwen3.8-27B-Instruct-4bit',
      last_prefix_lookup: {
        request_id: 'request-private',
        prompt_tokens: 1024,
        reused_kv_tokens: 480,
        reason: 'prefix_hit',
      },
    }],
  },
  };
};

describe('oMLX Telemetry contract', () => {
  it('normalizes live oMLX decode data without request identifiers', () => {
    const result = normalizeOmlxTelemetry(stats(), null, new Map([
      ['mlx-community/Qwen3.8-27B-Instruct-4bit', 131_072],
    ]), null, 123);
    expect(result).toMatchObject({
      available: true,
      runtime: 'omlx',
      phase: 'decode',
      modelID: 'mlx-community/Qwen3.8-27B-Instruct-4bit',
      sessionAveragePrefillTPS: 184.5,
      liveDecodeTPS: 24.6,
      sessionAverageDecodeTPS: 22.1,
      sessionCacheEfficiencyPercent: 63.3,
      promptTokens: 1024,
      cachedTokens: 480,
      completionTokens: 64,
      contextWindow: 131_072,
      sampledAt: 123,
    });
    expect(JSON.stringify(result)).not.toContain('request-private');
  });

  it('uses fresh activity and marks stale output as processing', () => {
    const stale = stats({
      generating: [{
        request_id: 'request-private',
        generated_tokens: 64,
        elapsed_seconds: 2.6,
        tokens_per_second: 24.6,
        last_activity_age_seconds: 12,
      }],
    });
    const activity = {
      active_models: stale.active_models,
    };
    const result = normalizeOmlxTelemetry(stale, activity);
    expect(result?.phase).toBe('processing');
    expect(result?.message).toMatch(/No recent output/);
    expect(result?.liveDecodeTPS).toBeNull();
  });

  it('subtracts only request-id-proven overlap from the waiting count', () => {
    const source = stats({
      generating: [],
      waiting: [{ request_id: 'same-request' }, { request_id: 'queued-request' }],
      prefilling: [{ request_id: 'same-request', processed: 2, total: 10 }],
      total_waiting_requests: 2,
    });
    const result = normalizeOmlxTelemetry(source, null);
    expect(result?.queuedRequests).toBe(1);
    expect(result?.phase).toBe('prefill');
  });

  it('rejects incomplete raw payloads', () => {
    expect(normalizeOmlxTelemetry({}, null)).toBeNull();
    expect(normalizeOmlxTelemetry({ engines: {}, total_requests: 1, active_models: { models: [] } }, null)).toBeNull();
  });

  it('keeps malformed service values out of the panel contract', () => {
    const result = parseTelemetrySnapshot({
      available: true,
      runtime: 'mtplx',
      phase: 'made-up',
      activeRequests: -1,
      memory: { activeGB: 'secret', modelGB: 4 },
      modelID: 'qwen',
    });
    expect(result).toMatchObject({
      available: true,
      runtime: null,
      phase: 'unknown',
      activeRequests: 0,
      memory: { activeGB: null, modelGB: 4 },
    });
  });
});
