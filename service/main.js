import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/jsonc-parser/lib/umd/main.js
var require_main = __commonJS((exports, module) => {
  (function(factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
      var v = factory(__require, exports);
      if (v !== undefined)
        module.exports = v;
    } else if (typeof define === "function" && define.amd) {
      define(["require", "exports", "./impl/format", "./impl/edit", "./impl/scanner", "./impl/parser"], factory);
    }
  })(function(require2, exports2) {
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.applyEdits = exports2.modify = exports2.format = exports2.printParseErrorCode = exports2.ParseErrorCode = exports2.stripComments = exports2.visit = exports2.getNodeValue = exports2.getNodePath = exports2.findNodeAtOffset = exports2.findNodeAtLocation = exports2.parseTree = exports2.parse = exports2.getLocation = exports2.SyntaxKind = exports2.ScanError = exports2.createScanner = undefined;
    const formatter = require2("./impl/format");
    const edit = require2("./impl/edit");
    const scanner = require2("./impl/scanner");
    const parser = require2("./impl/parser");
    exports2.createScanner = scanner.createScanner;
    var ScanError;
    (function(ScanError2) {
      ScanError2[ScanError2["None"] = 0] = "None";
      ScanError2[ScanError2["UnexpectedEndOfComment"] = 1] = "UnexpectedEndOfComment";
      ScanError2[ScanError2["UnexpectedEndOfString"] = 2] = "UnexpectedEndOfString";
      ScanError2[ScanError2["UnexpectedEndOfNumber"] = 3] = "UnexpectedEndOfNumber";
      ScanError2[ScanError2["InvalidUnicode"] = 4] = "InvalidUnicode";
      ScanError2[ScanError2["InvalidEscapeCharacter"] = 5] = "InvalidEscapeCharacter";
      ScanError2[ScanError2["InvalidCharacter"] = 6] = "InvalidCharacter";
    })(ScanError || (exports2.ScanError = ScanError = {}));
    var SyntaxKind;
    (function(SyntaxKind2) {
      SyntaxKind2[SyntaxKind2["OpenBraceToken"] = 1] = "OpenBraceToken";
      SyntaxKind2[SyntaxKind2["CloseBraceToken"] = 2] = "CloseBraceToken";
      SyntaxKind2[SyntaxKind2["OpenBracketToken"] = 3] = "OpenBracketToken";
      SyntaxKind2[SyntaxKind2["CloseBracketToken"] = 4] = "CloseBracketToken";
      SyntaxKind2[SyntaxKind2["CommaToken"] = 5] = "CommaToken";
      SyntaxKind2[SyntaxKind2["ColonToken"] = 6] = "ColonToken";
      SyntaxKind2[SyntaxKind2["NullKeyword"] = 7] = "NullKeyword";
      SyntaxKind2[SyntaxKind2["TrueKeyword"] = 8] = "TrueKeyword";
      SyntaxKind2[SyntaxKind2["FalseKeyword"] = 9] = "FalseKeyword";
      SyntaxKind2[SyntaxKind2["StringLiteral"] = 10] = "StringLiteral";
      SyntaxKind2[SyntaxKind2["NumericLiteral"] = 11] = "NumericLiteral";
      SyntaxKind2[SyntaxKind2["LineCommentTrivia"] = 12] = "LineCommentTrivia";
      SyntaxKind2[SyntaxKind2["BlockCommentTrivia"] = 13] = "BlockCommentTrivia";
      SyntaxKind2[SyntaxKind2["LineBreakTrivia"] = 14] = "LineBreakTrivia";
      SyntaxKind2[SyntaxKind2["Trivia"] = 15] = "Trivia";
      SyntaxKind2[SyntaxKind2["Unknown"] = 16] = "Unknown";
      SyntaxKind2[SyntaxKind2["EOF"] = 17] = "EOF";
    })(SyntaxKind || (exports2.SyntaxKind = SyntaxKind = {}));
    exports2.getLocation = parser.getLocation;
    exports2.parse = parser.parse;
    exports2.parseTree = parser.parseTree;
    exports2.findNodeAtLocation = parser.findNodeAtLocation;
    exports2.findNodeAtOffset = parser.findNodeAtOffset;
    exports2.getNodePath = parser.getNodePath;
    exports2.getNodeValue = parser.getNodeValue;
    exports2.visit = parser.visit;
    exports2.stripComments = parser.stripComments;
    var ParseErrorCode;
    (function(ParseErrorCode2) {
      ParseErrorCode2[ParseErrorCode2["InvalidSymbol"] = 1] = "InvalidSymbol";
      ParseErrorCode2[ParseErrorCode2["InvalidNumberFormat"] = 2] = "InvalidNumberFormat";
      ParseErrorCode2[ParseErrorCode2["PropertyNameExpected"] = 3] = "PropertyNameExpected";
      ParseErrorCode2[ParseErrorCode2["ValueExpected"] = 4] = "ValueExpected";
      ParseErrorCode2[ParseErrorCode2["ColonExpected"] = 5] = "ColonExpected";
      ParseErrorCode2[ParseErrorCode2["CommaExpected"] = 6] = "CommaExpected";
      ParseErrorCode2[ParseErrorCode2["CloseBraceExpected"] = 7] = "CloseBraceExpected";
      ParseErrorCode2[ParseErrorCode2["CloseBracketExpected"] = 8] = "CloseBracketExpected";
      ParseErrorCode2[ParseErrorCode2["EndOfFileExpected"] = 9] = "EndOfFileExpected";
      ParseErrorCode2[ParseErrorCode2["InvalidCommentToken"] = 10] = "InvalidCommentToken";
      ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfComment"] = 11] = "UnexpectedEndOfComment";
      ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfString"] = 12] = "UnexpectedEndOfString";
      ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfNumber"] = 13] = "UnexpectedEndOfNumber";
      ParseErrorCode2[ParseErrorCode2["InvalidUnicode"] = 14] = "InvalidUnicode";
      ParseErrorCode2[ParseErrorCode2["InvalidEscapeCharacter"] = 15] = "InvalidEscapeCharacter";
      ParseErrorCode2[ParseErrorCode2["InvalidCharacter"] = 16] = "InvalidCharacter";
    })(ParseErrorCode || (exports2.ParseErrorCode = ParseErrorCode = {}));
    function printParseErrorCode(code) {
      switch (code) {
        case 1:
          return "InvalidSymbol";
        case 2:
          return "InvalidNumberFormat";
        case 3:
          return "PropertyNameExpected";
        case 4:
          return "ValueExpected";
        case 5:
          return "ColonExpected";
        case 6:
          return "CommaExpected";
        case 7:
          return "CloseBraceExpected";
        case 8:
          return "CloseBracketExpected";
        case 9:
          return "EndOfFileExpected";
        case 10:
          return "InvalidCommentToken";
        case 11:
          return "UnexpectedEndOfComment";
        case 12:
          return "UnexpectedEndOfString";
        case 13:
          return "UnexpectedEndOfNumber";
        case 14:
          return "InvalidUnicode";
        case 15:
          return "InvalidEscapeCharacter";
        case 16:
          return "InvalidCharacter";
      }
      return "<unknown ParseErrorCode>";
    }
    exports2.printParseErrorCode = printParseErrorCode;
    function format(documentText, range, options) {
      return formatter.format(documentText, range, options);
    }
    exports2.format = format;
    function modify(text2, path, value, options) {
      return edit.setProperty(text2, path, value, options);
    }
    exports2.modify = modify;
    function applyEdits(text2, edits) {
      let sortedEdits = edits.slice(0).sort((a, b) => {
        const diff = a.offset - b.offset;
        if (diff === 0) {
          return a.length - b.length;
        }
        return diff;
      });
      let lastModifiedOffset = text2.length;
      for (let i = sortedEdits.length - 1;i >= 0; i--) {
        let e = sortedEdits[i];
        if (e.offset + e.length <= lastModifiedOffset) {
          text2 = edit.applyEdit(text2, e);
        } else {
          throw new Error("Overlapping edit");
        }
        lastModifiedOffset = e.offset;
      }
      return text2;
    }
    exports2.applyEdits = applyEdits;
  });
});

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
  modelID: null,
  phase: "unknown",
  sessionStatsState: "unavailable",
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
  activeRequests: null,
  queuedRequests: null,
  contextWindow: null,
  memory: null,
  sessionBank: null,
  lifetime: null,
  memoryPressureLevel: null,
  memoryPressureSource: null,
  sampledAt,
  traceEpoch: null,
  system: null
});
var unavailableTelemetry = (reason, message = null, sampledAt = Date.now()) => ({
  available: false,
  reason,
  ...emptyFields(sampledAt),
  message: text(message)
});
var arrayOfObjects = (value) => Array.isArray(value) ? value.map(asObject).filter((item) => item !== null) : [];
var matchingModel = (models, preferredModel) => models.find((model) => Array.isArray(model.generating) && model.generating.length > 0) ?? models.find((model) => Array.isArray(model.prefilling) && model.prefilling.length > 0) ?? models.find((model) => (nonnegative(model.active_requests) ?? 0) > 0) ?? models.find((model) => model.is_loading === true) ?? (preferredModel === null ? undefined : models.find((model) => model.id === preferredModel)) ?? models[0] ?? null;
var normalizeFlights = (model, lookup, ambiguous = false) => {
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
  const hasStateEvidence = [
    "active_requests",
    "waiting_requests",
    "prefilling",
    "generating",
    "waiting",
    "activities",
    "is_loading"
  ].some((key) => Object.prototype.hasOwnProperty.call(model, key));
  if (!hasStateEvidence) {
    return {
      phase: "unknown",
      message: "Model state unavailable · waiting for a complete runtime sample",
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
  if (ambiguous) {
    return { ...summary, phase: "processing", message: "Concurrent requests or models · per-request values withheld" };
  }
  const waiting = arrayOfObjects(model.waiting);
  const prefilling = arrayOfObjects(model.prefilling);
  const generatingFlights = arrayOfObjects(model.generating);
  if (prefilling.length + generatingFlights.length > 1 || (nonnegative(model.active_requests) ?? 0) > 1) {
    return { ...summary, phase: "processing", message: "Concurrent requests · per-request speed withheld" };
  }
  for (const prefill of prefilling) {
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
      livePrefillTPS: prefill.progress_stale === true ? null : firstNumber(prefill.speed),
      promptTokens,
      cachedTokens,
      prefillProgress: progress,
      elapsedSeconds: firstNumber(prefill.elapsed)
    };
  }
  for (const generating of generatingFlights) {
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
        cachedTokens,
        completionTokens: nonnegative(generating.generated_tokens),
        elapsedSeconds: nonnegative(generating.elapsed_seconds)
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
  if (arrayOfObjects(model.activities).length > 0 && summary.phase === "idle") {
    summary = {
      ...summary,
      phase: "processing",
      message: "Runtime active · detailed token progress unavailable"
    };
  }
  if ((nonnegative(model.active_requests) ?? 0) > 0 && summary.phase === "idle") {
    summary = { ...summary, phase: "processing" };
  }
  if (summary.cachedTokens !== null && (summary.promptTokens === null || summary.cachedTokens > summary.promptTokens)) {
    summary.cachedTokens = null;
  }
  return summary;
};
var normalizeWaiting = (models, active) => {
  const reported = nonnegative(active.total_waiting_requests) ?? (models.length === 0 ? 0 : models.every((model) => nonnegative(model.waiting_requests) !== null) ? models.reduce((total, model) => total + nonnegative(model.waiting_requests), 0) : null);
  if (reported === null)
    return null;
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
  activeGB: asObject(active.memory_pressure)?.enabled === true ? gb(asObject(active.memory_pressure)?.current_bytes) : null,
  peakGB: null,
  modelGB: gb(model?.actual_size),
  cacheGB: gb(cache.hot_cache_size_bytes)
});
var normalizeSessionBank = (cache, lookup) => {
  const cold = asObject(cache.cold_tier);
  const bank = {
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
  return [
    bank.hot?.totalGB,
    bank.hot?.entries,
    bank.cold?.totalGB,
    bank.cold?.entries,
    bank.lastMissReason
  ].some((value) => value !== null && value !== undefined) ? bank : null;
};
var normalizeLifetime = (stats) => {
  const lifetime = {
    requestsTotal: firstNumber(stats.total_requests),
    promptTokensTotal: firstNumber(stats.total_prompt_tokens),
    completionTokensTotal: firstNumber(stats.total_completion_tokens),
    cachedTokensTotal: firstNumber(stats.total_cached_tokens),
    uptimeSeconds: firstNumber(stats.uptime_seconds)
  };
  return Object.values(lifetime).some((value) => value !== null) ? lifetime : null;
};
var normalizeOmlxTelemetry = (statsValue, activityValue, contextWindows = new Map, preferredModel = null, sampledAt = Date.now(), sessionStatsState = "fresh") => {
  const stats = asObject(statsValue);
  const savedActive = stats === null ? null : asObject(stats.active_models);
  const statsAreUsable = stats !== null && savedActive !== null && asObject(stats.engines) !== null;
  let active = savedActive;
  if (activityValue !== null) {
    const activity = asObject(activityValue);
    const freshActive = activity === null ? null : asObject(activity.active_models);
    if (freshActive === null)
      return null;
    active = freshActive;
  }
  if (active === null || !Array.isArray(active.models))
    return null;
  const models = arrayOfObjects(active.models);
  const model = matchingModel(models, preferredModel);
  const modelID = text(model?.id);
  const activeRequests = models.length === 0 ? 0 : nonnegative(active.total_active_requests) ?? (models.every((item) => nonnegative(item.active_requests) !== null) ? models.reduce((total, item) => total + nonnegative(item.active_requests), 0) : null);
  const activeModelCount = models.filter((item) => arrayOfObjects(item.prefilling).length + arrayOfObjects(item.generating).length > 0 || (nonnegative(item.active_requests) ?? 0) > 0).length;
  const ambiguous = activeModelCount > 1 || activeRequests !== null && activeRequests > 1;
  const statsData = statsAreUsable ? stats : {};
  const cache = asObject(statsData.runtime_cache) ?? {};
  const modelCache = arrayOfObjects(cache.models).find((candidate) => text(candidate.id) === modelID) ?? {};
  const lookup = asObject(modelCache.last_prefix_lookup) ?? {};
  const flight = normalizeFlights(model, lookup, ambiguous);
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
  const memory = normalizeMemory(active, model, cache);
  return {
    available: true,
    reason: null,
    message: flight.message,
    runtime: "omlx",
    modelID,
    phase: models.length === 0 ? "notLoaded" : flight.phase === "idle" && queuedRequests !== null && queuedRequests > 0 ? "queued" : flight.phase,
    sessionStatsState,
    sessionAveragePrefillTPS: firstNumber(statsData.avg_prefill_tps),
    liveDecodeTPS: flight.liveDecodeTPS,
    livePrefillTPS: flight.livePrefillTPS,
    sessionAverageDecodeTPS: firstNumber(statsData.avg_generation_tps),
    sessionCacheEfficiencyPercent: firstNumber(statsData.cache_efficiency),
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
    lifetime: sessionStatsState === "unavailable" && !statsAreUsable ? null : normalizeLifetime(statsData),
    memoryPressureLevel: pressureLevel,
    memoryPressureSource: pressureLevel === null ? null : "oMLX process memory guard (not macOS pressure)",
    sampledAt,
    traceEpoch: null,
    system: null
  };
};

// service/config.ts
var import_jsonc_parser = __toESM(require_main(), 1);
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
var asObject2 = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
var nonempty = (value) => {
  if (typeof value !== "string")
    return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
var normalizeReadText = (content) => {
  if (typeof content === "string")
    return { kind: "ok", text: content };
  return content ?? { kind: "missing" };
};
var readJson = async (path, readText) => {
  const content = normalizeReadText(await readText(path));
  if (content.kind !== "ok")
    return { status: content.kind, value: null };
  const errors = [];
  const value = asObject2(import_jsonc_parser.parse(content.text, errors, { allowTrailingComma: true }));
  return errors.length === 0 && value !== null ? { status: "ok", value } : { status: "malformed", value: null };
};
var defaultReadText = async (path) => {
  try {
    return { kind: "ok", text: await readFile(path, "utf8") };
  } catch (error) {
    return error.code === "ENOENT" ? { kind: "missing" } : { kind: "unreadable" };
  }
};
var pathsForHome = (home, env = process.env) => {
  const configHome = nonempty(env.XDG_CONFIG_HOME) ?? join(home, ".config");
  const dataHome = nonempty(env.XDG_DATA_HOME) ?? join(home, ".local", "share");
  const openCodeHome = join(configHome, "opencode");
  return {
    openCode: join(openCodeHome, "opencode.json"),
    openCodeJSONC: join(openCodeHome, "opencode.jsonc"),
    omlx: join(home, ".omlx", "settings.json"),
    auth: join(dataHome, "opencode", "auth.json")
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
  if (url.pathname !== "" && url.pathname !== "/" && (!stripPath || !["/v1", "/v1/"].includes(url.pathname)))
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
var statusOf = (documents) => {
  if (documents.some((document) => document.status === "malformed"))
    return "malformed";
  if (documents.some((document) => document.status === "unreadable"))
    return "unreadable";
  if (documents.some((document) => document.status === "ok"))
    return "present";
  return "missing";
};
var has = (value, key) => value !== null && Object.prototype.hasOwnProperty.call(value, key);
var merge = (base, overlay) => {
  const result = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const previous = asObject2(result[key]);
    const next = asObject2(value);
    result[key] = previous !== null && next !== null ? merge(previous, next) : value;
  }
  return result;
};
var selectedOmlxModel = (config, env) => {
  const configured = nonempty(env.OMLX_SCOPE_MODEL);
  const model = configured ?? nonempty(config?.model);
  if (model === null)
    return null;
  const [provider, ...rest] = model.split("/");
  if (configured !== null)
    return provider === "omlx" && rest.length > 0 ? rest.join("/") : configured;
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
  const configOverride = nonempty(env.OPENCODE_CONFIG);
  const unsupportedOverride = configOverride !== null && !isAbsolute(configOverride);
  const configFiles = [
    await readJson(paths.openCode, readText),
    await readJson(paths.openCodeJSONC, readText)
  ];
  if (configOverride !== null && !unsupportedOverride)
    configFiles.push(await readJson(configOverride, readText));
  const omlx = await readJson(paths.omlx, readText);
  const auth = await readJson(paths.auth, readText);
  const configProblem = configFiles.find((document) => document.status === "unreadable" || document.status === "malformed");
  const mergedOpenCode = configProblem === undefined ? configFiles.filter((document) => document.status === "ok").reduce((result, document) => merge(result, document.value), {}) : null;
  const options = providerOptions(mergedOpenCode);
  const providerHasBase = has(options, "baseURL");
  const providerBase = providerHasBase ? options?.baseURL : undefined;
  const envBase = nonempty(env.OMLX_SCOPE_BASE_URL);
  const nativeCandidate = nativeEndpoint(omlx.value);
  const nativeProblem = omlx.status === "unreadable" || omlx.status === "malformed" ? omlx.status : null;
  const configStatus = statusOf(configFiles);
  const authStatus = statusOf([auth]);
  const endpointSource = envBase !== null ? "environment" : providerHasBase ? "opencode" : nativeCandidate !== null ? "omlx" : null;
  const sourceProblem = unsupportedOverride ? "unsupported_config" : configProblem?.status === "unreadable" ? "unreadable_config" : configProblem?.status === "malformed" ? "malformed_config" : envBase !== null || providerHasBase ? "none" : nativeProblem === "unreadable" ? "unreadable_config" : nativeProblem === "malformed" ? "malformed_config" : "none";
  const endpointCandidate = envBase ?? (typeof providerBase === "string" ? providerBase : providerHasBase ? null : nativeCandidate);
  const baseURL = sourceProblem !== "none" && envBase === null ? null : parseLoopbackOrigin(endpointCandidate, envBase === null && providerHasBase && typeof providerBase === "string");
  const endpointIssue = sourceProblem !== "none" && envBase === null ? sourceProblem : endpointCandidate === null ? providerHasBase ? "invalid_endpoint" : "missing_endpoint" : baseURL === null ? "invalid_endpoint" : "none";
  const envKey = nonempty(env.OMLX_SCOPE_API_KEY);
  const authProvider = asObject2(asObject2(auth.value)?.omlx);
  const authKey = authProvider?.type === "api" ? nonempty(authProvider.key) : null;
  const credentialIssue = envKey !== null || authKey !== null ? "none" : auth.status === "unreadable" ? "unreadable_config" : auth.status === "malformed" ? "malformed_config" : "missing_credential";
  const issue = endpointIssue !== "none" ? endpointIssue : credentialIssue;
  const error = issue === "missing_endpoint" ? "No oMLX endpoint was found in OpenCode or oMLX configuration." : issue === "invalid_endpoint" ? "The saved oMLX endpoint is not a numeric loopback HTTP origin." : issue === "missing_credential" ? "No oMLX API credential was found in OpenCode auth." : issue === "malformed_config" ? "A supported oMLX configuration file is malformed." : issue === "unreadable_config" ? "A supported oMLX configuration file could not be read." : issue === "unsupported_config" ? "OPENCODE_CONFIG must be an absolute path when supplied to the service." : null;
  return {
    baseURL,
    apiKey: envKey ?? authKey,
    preferredModel: selectedOmlxModel(mergedOpenCode, env),
    error,
    issue,
    source: baseURL === null ? null : endpointSource,
    configStatus,
    authStatus
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
  fetchImpl,
  timeoutMs = 3000
}) => {
  const controller = new AbortController;
  let timer;
  try {
    const work = async () => {
      const response = await fetchImpl(url.toString(), {
        ...init,
        redirect: "manual",
        signal: controller.signal
      });
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
        const reader = response.body?.getReader();
        let size = 0;
        const chunks = [];
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done)
              break;
            size += value.byteLength;
            if (size > 2000000) {
              await reader.cancel();
              throw new Error("Response too large");
            }
            chunks.push(value);
          }
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        body = asObject3(JSON.parse(new TextDecoder().decode(bytes)));
      } catch {
        throw new OmlxFailure("runtime_unreachable", "The oMLX runtime returned invalid JSON.");
      }
      return {
        status: response.status,
        body,
        cookie: extractCookie(response.headers.get("set-cookie"))
      };
    };
    return await Promise.race([
      work(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new OmlxFailure("runtime_unreachable", "The oMLX request timed out."));
        }, Math.max(1, timeoutMs));
      })
    ]);
  } catch (error) {
    if (error instanceof OmlxFailure)
      throw error;
    throw new OmlxFailure("runtime_unreachable", "The oMLX runtime did not answer.");
  } finally {
    clearTimeout(timer);
  }
};
var resettableConfig = (config) => `${config.baseURL?.toString() ?? ""}\x00${config.apiKey ?? ""}`;
var isStatsPayload = (body) => body !== null && asObject3(body.engines) !== null && asObject3(body.active_models) !== null;
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
  monotonicNow;
  requestTimeoutMs;
  collectionDeadlineMs;
  configKey = "";
  cookie = null;
  stats = null;
  statsState = "unavailable";
  statsAt = Number.NEGATIVE_INFINITY;
  identityAt = Number.NEGATIVE_INFINITY;
  modelStatusAt = Number.NEGATIVE_INFINITY;
  contextWindows = new Map;
  inFlight = null;
  lastSnapshot = null;
  snapshotAt = Number.NEGATIVE_INFINITY;
  config = null;
  configAt = Number.NEGATIVE_INFINITY;
  signalIdentity = "";
  traceEpoch = 0;
  prefill = new Map;
  constructor(options = {}) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.readConfig = options.readConfig ?? resolveOmlxConfig;
    this.now = options.now ?? (() => Date.now());
    this.monotonicNow = options.monotonicNow ?? (options.now ? options.now : () => performance.now());
    this.requestTimeoutMs = options.requestTimeoutMs ?? 3000;
    this.collectionDeadlineMs = options.collectionDeadlineMs ?? 8000;
  }
  snapshot() {
    if (this.inFlight)
      return this.inFlight;
    if (this.lastSnapshot && this.lastSnapshot.available && this.monotonicNow() - this.snapshotAt < 450) {
      return Promise.resolve(this.lastSnapshot);
    }
    this.inFlight = this.collect().catch(() => unavailableTelemetry("runtime_unreachable", "Local telemetry is unavailable.")).then((snapshot) => {
      this.lastSnapshot = snapshot;
      this.snapshotAt = this.monotonicNow();
      return snapshot;
    }).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }
  async configuration() {
    if (this.config === null || this.monotonicNow() - this.configAt >= 5000) {
      this.config = await this.readConfig();
      this.configAt = this.monotonicNow();
    }
    return this.config;
  }
  async collect() {
    const config = await this.configuration();
    if (config.baseURL === null) {
      return unavailableTelemetry("runtime_unreachable", config.error);
    }
    if (config.apiKey === null) {
      return unavailableTelemetry("authentication_failed", "No oMLX API credential was found in OpenCode auth.");
    }
    const key = `${resettableConfig(config)}\x00${config.preferredModel ?? ""}`;
    if (key !== this.configKey) {
      this.configKey = key;
      this.cookie = null;
      this.stats = null;
      this.statsState = "unavailable";
      this.statsAt = Number.NEGATIVE_INFINITY;
      this.identityAt = Number.NEGATIVE_INFINITY;
      this.modelStatusAt = Number.NEGATIVE_INFINITY;
      this.contextWindows = new Map;
      this.signalIdentity = "";
      this.prefill.clear();
      this.traceEpoch += 1;
    }
    try {
      const startedAt = this.monotonicNow();
      const deadline = startedAt + this.collectionDeadlineMs;
      const timeoutFor = (limit = this.requestTimeoutMs) => {
        const remaining = deadline - this.monotonicNow();
        if (remaining <= 0)
          throw new OmlxFailure("runtime_unreachable", "The oMLX snapshot deadline expired.");
        return Math.max(1, Math.min(limit, remaining));
      };
      if (startedAt - this.identityAt >= 300000) {
        await this.verifyIdentity(config.baseURL, timeoutFor());
        this.identityAt = this.monotonicNow();
      }
      if (this.cookie === null)
        this.cookie = await this.login(config.baseURL, config.apiKey, timeoutFor());
      const readStatus = this.monotonicNow() - this.modelStatusAt >= 60000;
      const readSessionStats = this.monotonicNow() - this.statsAt >= 3000;
      const activityPromise = this.readActivity(config.baseURL, this.cookie, timeoutFor());
      const statusPromise = readStatus ? this.readModelStatus(config.baseURL, config.apiKey, timeoutFor(Math.min(this.requestTimeoutMs, 1000))) : Promise.resolve(null);
      const statsPromise = readSessionStats ? this.readStats(config.baseURL, this.cookie, timeoutFor()).then((value) => ({ value, error: null }), (error) => ({ value: null, error })) : Promise.resolve(null);
      const [activity, contextWindows, statsResult] = await Promise.all([activityPromise, statusPromise, statsPromise]);
      if (readStatus && contextWindows !== null) {
        this.contextWindows = contextWindows;
        this.modelStatusAt = this.monotonicNow();
      }
      if (readSessionStats && statsResult !== null) {
        if (statsResult.error instanceof OmlxFailure && statsResult.error.reason === "authentication_failed") {
          throw statsResult.error;
        }
        if (statsResult.value !== null) {
          this.stats = statsResult.value;
          this.statsState = "fresh";
        } else {
          this.statsState = this.stats === null ? "unavailable" : "stale";
        }
        this.statsAt = this.monotonicNow();
      }
      this.observeProgress(activity);
      const normalized = normalizeOmlxTelemetry(this.stats, activity, this.contextWindows, config.preferredModel, this.now(), this.statsState);
      if (normalized === null) {
        throw new OmlxFailure("runtime_unreachable", "oMLX returned an unexpected telemetry shape.");
      }
      return {
        ...normalized,
        traceEpoch: this.traceEpoch,
        message: normalized.message ?? (this.statsState === "stale" ? "Live activity connected · session statistics are from the last successful read" : this.statsState === "unavailable" ? "Live activity connected · session statistics unavailable" : null)
      };
    } catch (error) {
      this.signalIdentity = "";
      this.traceEpoch += 1;
      this.prefill.clear();
      if (error instanceof OmlxFailure) {
        if (error.reason === "authentication_failed") {
          this.cookie = null;
          this.stats = null;
          this.statsState = "unavailable";
          this.statsAt = Number.NEGATIVE_INFINITY;
          this.configAt = Number.NEGATIVE_INFINITY;
          this.identityAt = Number.NEGATIVE_INFINITY;
        } else {
          this.identityAt = Number.NEGATIVE_INFINITY;
        }
        return unavailableTelemetry(error.reason, error.message);
      }
      this.cookie = null;
      this.stats = null;
      this.statsState = "unavailable";
      this.identityAt = Number.NEGATIVE_INFINITY;
      return unavailableTelemetry("runtime_unreachable", "The oMLX telemetry request failed.");
    }
  }
  observeProgress(activity) {
    const active = asObject3(activity.active_models);
    const observedAt = this.monotonicNow();
    const identities = [];
    const activePrefills = new Set;
    for (const modelValue of Array.isArray(active?.models) ? active.models : []) {
      const model = asObject3(modelValue);
      if (!model)
        continue;
      for (const kind of ["prefilling", "generating"]) {
        for (const entry of Array.isArray(model[kind]) ? model[kind] : []) {
          const flight = asObject3(entry);
          if (!flight)
            continue;
          const identity2 = JSON.stringify([model.id, kind, flight.request_id]);
          identities.push(identity2);
          if (kind !== "prefilling")
            continue;
          activePrefills.add(identity2);
          const processed = nonnegative2(flight.processed);
          if (processed === null)
            continue;
          const previous = this.prefill.get(identity2);
          if (!previous || previous.processed !== processed)
            this.prefill.set(identity2, { processed, changedAt: observedAt });
          if (previous && previous.processed === processed && observedAt - previous.changedAt >= 15000) {
            flight.progress_stale = true;
          }
        }
      }
    }
    for (const key of this.prefill.keys())
      if (!activePrefills.has(key))
        this.prefill.delete(key);
    const identity = identities.sort().join("|");
    if (identity !== this.signalIdentity) {
      this.traceEpoch += 1;
      this.signalIdentity = identity;
    }
  }
  async verifyIdentity(baseURL, timeoutMs) {
    const response = await requestJSON({
      url: new URL("/health", baseURL),
      fetchImpl: this.fetchImpl,
      timeoutMs,
      init: { method: "GET", headers: { Accept: "application/json" } }
    });
    if (!isHealthy(response.body)) {
      throw new OmlxFailure("runtime_unreachable", "The service answered, but it did not identify as oMLX.");
    }
  }
  async login(baseURL, apiKey, timeoutMs) {
    const response = await requestJSON({
      url: new URL("/admin/api/login", baseURL),
      fetchImpl: this.fetchImpl,
      timeoutMs,
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
  async readModelStatus(baseURL, apiKey, timeoutMs) {
    try {
      const response = await requestJSON({
        url: new URL("/v1/models/status", baseURL),
        fetchImpl: this.fetchImpl,
        timeoutMs,
        init: { method: "GET", headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` } }
      });
      return parseContextWindows(response.body);
    } catch {
      return new Map;
    }
  }
  async readStats(baseURL, cookie, timeoutMs) {
    const response = await requestJSON({
      url: new URL("/admin/api/stats?scope=session", baseURL),
      fetchImpl: this.fetchImpl,
      timeoutMs,
      init: { method: "GET", headers: { Accept: "application/json", Cookie: `omlx_admin_session=${cookie}` } }
    });
    return isStatsPayload(response.body) ? response.body : null;
  }
  async readActivity(baseURL, cookie, timeoutMs) {
    const response = await requestJSON({
      url: new URL("/admin/api/activity", baseURL),
      fetchImpl: this.fetchImpl,
      timeoutMs,
      init: { method: "GET", headers: { Accept: "application/json", Cookie: `omlx_admin_session=${cookie}` } }
    });
    if (response.body === null)
      throw new OmlxFailure("runtime_unreachable", "oMLX activity was empty.");
    return response.body;
  }
}

// service/system.ts
import { cpus, freemem, totalmem, platform } from "node:os";
var cpuUsage = (previous, current) => {
  if (previous === null)
    return null;
  const total = current.total - previous.total;
  const idle = current.idle - previous.idle;
  if (total <= 0 || idle < 0 || idle > total)
    return null;
  return Math.max(0, Math.min(100, (1 - idle / total) * 100));
};

class SystemSampler {
  previous = null;
  cached = null;
  sample(now = Date.now()) {
    if (this.cached && now - this.cached.sampledAt < 2000)
      return this.cached;
    const ticks = cpus().reduce((result, cpu) => ({
      idle: result.idle + cpu.times.idle,
      total: result.total + Object.values(cpu.times).reduce((sum, time) => sum + time, 0)
    }), { idle: 0, total: 0 });
    const total = totalmem();
    this.cached = {
      platform: platform(),
      cpuPercent: cpuUsage(this.previous, ticks),
      memoryUsedGB: Math.max(0, total - freemem()) / 1e9,
      memoryTotalGB: total / 1e9,
      sampledAt: now
    };
    this.previous = ticks;
    return this.cached;
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
var system = new SystemSampler;
var server = http.createServer((request, response) => {
  (async () => {
    try {
      if (!authorized(request)) {
        json(response, 401, { error: "unauthorized" });
        return;
      }
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (request.method === "GET" && url.pathname === "/health") {
        json(response, 200, { status: "healthy" });
        return;
      }
      if (request.method === "GET" && url.pathname === "/snapshot") {
        json(response, 200, { ...await client.snapshot(), system: system.sample() });
        return;
      }
      json(response, 404, { error: "not_found" });
    } catch (error) {
      console.error(`OMLX Scope service request failed: ${error instanceof Error ? error.message : String(error)}`);
      if (!response.headersSent)
        json(response, 503, { error: "service_failed" });
    }
  })();
});
server.on("error", (error) => {
  console.error(`OMLX Scope service stopped: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
var stopping = false;
var stop = () => {
  if (stopping)
    return;
  stopping = true;
  const forceExit = setTimeout(() => process.exit(1), 1000);
  forceExit.unref();
  server.close(() => {
    clearTimeout(forceExit);
    process.exit(0);
  });
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
server.listen(port, "127.0.0.1");
