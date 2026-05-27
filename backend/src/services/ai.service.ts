/**
 * AI Service — Singleton client for Google GenAI SDK
 *
 * Provides:
 *   - generateText()      → text generation with retry + timeout
 *   - generateEmbedding() → embedding generation with retry + timeout
 *   - healthCheck()       → model validation
 *   - Circuit breaker to prevent repeated failing calls
 *   - Structured error codes (AI_MODEL_UNAVAILABLE, EMBEDDING_FAILED, etc.)
 *   - Structured logging with [AI] prefix
 *
 * All public methods return null on failure (never throw),
 * allowing callers to degrade gracefully.
 *
 * Retry policy:
 *   - Fast-fail (no retry) on: 404 (model not found), 400 (bad key/invalid),
 *     429 (quota exhausted). These are permanent failures.
 *   - Retry on: network timeout, 500, 503 (transient infrastructure failures).
 */

import { GoogleGenAI } from '@google/genai';
import { aiConfig } from '../config/ai.config';

const LOG_PREFIX = '[AI]';
const EMBED_PREFIX = '[Embedding]';

// ── AI Error Codes ───────────────────────────────────────────────────────────

export const AIErrorCode = {
  AI_MODEL_UNAVAILABLE: 'AI_MODEL_UNAVAILABLE',
  EMBEDDING_FAILED: 'EMBEDDING_FAILED',
  AI_TIMEOUT: 'AI_TIMEOUT',
  INVALID_AI_RESPONSE: 'INVALID_AI_RESPONSE',
  AI_CIRCUIT_OPEN: 'AI_CIRCUIT_OPEN',
  AI_NOT_CONFIGURED: 'AI_NOT_CONFIGURED',
} as const;

export type AIErrorCodeType = typeof AIErrorCode[keyof typeof AIErrorCode];

export class AIError extends Error {
  public readonly code: AIErrorCodeType;
  public readonly model?: string;
  public readonly retries?: number;
  public readonly durationMs?: number;

  constructor(
    message: string,
    code: AIErrorCodeType,
    details?: { model?: string; retries?: number; durationMs?: number },
  ) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.model = details?.model;
    this.retries = details?.retries;
    this.durationMs = details?.durationMs;
  }
}

// ── Circuit Breaker ──────────────────────────────────────────────────────────

interface CircuitBreakerState {
  failures: number;
  lastFailureAt: number;
  isOpen: boolean;
}

const circuitBreakers: Record<string, CircuitBreakerState> = {};

function getCircuitBreaker(key: string): CircuitBreakerState {
  if (!circuitBreakers[key]) {
    circuitBreakers[key] = { failures: 0, lastFailureAt: 0, isOpen: false };
  }
  return circuitBreakers[key];
}

function recordSuccess(key: string): void {
  const cb = getCircuitBreaker(key);
  cb.failures = 0;
  cb.isOpen = false;
}

function recordFailure(key: string): void {
  const cb = getCircuitBreaker(key);
  cb.failures++;
  cb.lastFailureAt = Date.now();
  if (cb.failures >= aiConfig.circuitBreakerThreshold) {
    if (!cb.isOpen) {
      console.warn(
        `${LOG_PREFIX} Circuit breaker OPEN for "${key}" after ${cb.failures} failures. ` +
        `Cooldown: ${aiConfig.circuitBreakerCooldownMs}ms`,
      );
    }
    cb.isOpen = true;
  }
}

function isCircuitOpen(key: string): boolean {
  const cb = getCircuitBreaker(key);
  if (!cb.isOpen) return false;

  // Check if cooldown has elapsed
  const elapsed = Date.now() - cb.lastFailureAt;
  if (elapsed >= aiConfig.circuitBreakerCooldownMs) {
    console.log(`${LOG_PREFIX} Circuit breaker HALF-OPEN for "${key}" — allowing retry`);
    cb.isOpen = false;
    cb.failures = 0;
    return false;
  }

  return true;
}

// ── Error classification helpers ─────────────────────────────────────────────

/**
 * Returns true for permanent API errors that should NOT be retried.
 * Retrying these wastes quota and adds latency with no chance of success.
 */
function isPermanentError(message: string): boolean {
  return (
    // 429 Quota exhausted — retrying will only make it worse
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('Quota exceeded') ||
    // 404 Model not found — model name is wrong, retry won't help
    message.includes('404') ||
    message.includes('NOT_FOUND') ||
    // 400 Invalid argument / bad API key — config error, retry won't help
    (message.includes('400') && (
      message.includes('INVALID_ARGUMENT') ||
      message.includes('API_KEY_INVALID') ||
      message.includes('API key not valid')
    ))
  );
}

// ── Retry + Timeout helpers ──────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`AI request timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  label: string,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Fast-fail on permanent errors — no retry storm
      if (isPermanentError(lastError.message)) {
        const reason = lastError.message.includes('429') ? 'QUOTA_EXHAUSTED'
          : lastError.message.includes('404') || lastError.message.includes('NOT_FOUND') ? 'MODEL_NOT_FOUND'
          : 'INVALID_REQUEST';
        console.error(
          `${LOG_PREFIX} ${label} permanent failure [${reason}] — short-circuiting retries.`,
        );
        throw lastError;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.warn(
          `${LOG_PREFIX} ${label} attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. ` +
          `Retrying in ${delay}ms…`,
        );
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ── Singleton client ─────────────────────────────────────────────────────────

let clientInstance: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!aiConfig.isConfigured || !aiConfig.apiKey) return null;
  if (!clientInstance) {
    clientInstance = new GoogleGenAI({ apiKey: aiConfig.apiKey });
  }
  return clientInstance;
}

// ── Public API ───────────────────────────────────────────────────────────────

export const AIService = {
  /**
   * Generate text content using the configured text model.
   * Returns the raw text response, or null on any failure.
   */
  async generateText(
    prompt: string,
    options?: { temperature?: number; responseMimeType?: string },
  ): Promise<string | null> {
    const model = aiConfig.textModel;
    const circuitKey = `text:${model}`;
    const startMs = Date.now();

    if (!aiConfig.isConfigured) {
      console.warn(`${LOG_PREFIX} Not configured — skipping text generation`);
      return null;
    }

    if (isCircuitOpen(circuitKey)) {
      console.warn(`${LOG_PREFIX} Circuit OPEN for ${model} — skipping text generation`);
      return null;
    }

    const client = getClient();
    if (!client) return null;

    try {
      const result = await withRetry(
        () =>
          withTimeout(
            client.models.generateContent({
              model,
              contents: prompt,
              config: {
                temperature: options?.temperature ?? aiConfig.defaultTemperature,
                responseMimeType: options?.responseMimeType,
              },
            }),
            8000, // 8s timeout for text generation
          ),
        aiConfig.maxRetries,
        `generateText(${model})`,
      );

      const text = result.text;
      if (!text) {
        console.warn(`${LOG_PREFIX} Empty response from ${model}`);
        recordFailure(circuitKey);
        return null;
      }

      const elapsed = Date.now() - startMs;
      recordSuccess(circuitKey);
      console.log(`${LOG_PREFIX} Text OK model=${model} len=${text.length} ${elapsed}ms`);
      return text;
    } catch (err) {
      const elapsed = Date.now() - startMs;
      const message = err instanceof Error ? err.message : String(err);
      recordFailure(circuitKey);

      // Classify error
      const isTimeout = message.includes('timed out');
      const is404 = message.includes('404') || message.includes('NOT_FOUND');
      const code = isTimeout
        ? AIErrorCode.AI_TIMEOUT
        : is404
          ? AIErrorCode.AI_MODEL_UNAVAILABLE
          : AIErrorCode.INVALID_AI_RESPONSE;

      console.error(
        `${LOG_PREFIX} Text FAIL model=${model} code=${code} ${elapsed}ms: ${message}`,
      );
      return null;
    }
  },

  /**
   * Generate a JSON-parsed response from the text model.
   * Uses responseMimeType: 'application/json' for structured output.
   * Returns null on failure or parse error.
   */
  async generateJSON<T = unknown>(prompt: string): Promise<T | null> {
    const raw = await this.generateText(prompt, {
      responseMimeType: 'application/json',
    });

    if (!raw) return null;

    try {
      let cleanText = raw.trim();
      // Strip markdown code fences if present
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```/, '').replace(/```$/, '').trim();
      }
      return JSON.parse(cleanText) as T;
    } catch (parseErr) {
      console.error(`${LOG_PREFIX} JSON parse failed:`, raw.slice(0, 200));
      return null;
    }
  },

  /**
   * Generate an embedding vector for a given text.
   *
   * Uses gemini-embedding-001 (or configured GEMINI_EMBEDDING_MODEL).
   * The model default dimension is 3072; cosine similarity works on any dimension
   * as long as both vectors use the same model.
   *
   * Returns null on failure (never throws).
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    const model = aiConfig.embeddingModel;
    const circuitKey = `embedding:${model}`;
    const startMs = Date.now();

    if (!aiConfig.isConfigured) {
      console.warn(`${EMBED_PREFIX} Not configured — skipping embedding generation`);
      return null;
    }

    if (!aiConfig.enableSemanticScoring) {
      return null;
    }

    if (isCircuitOpen(circuitKey)) {
      console.warn(`${EMBED_PREFIX} Circuit OPEN for ${model} — skipping embedding`);
      return null;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      console.warn(`${EMBED_PREFIX} Empty text provided — skipping`);
      return null;
    }

    // Truncate to safe limits
    const input = trimmed.length > aiConfig.maxEmbeddingInputChars
      ? trimmed.slice(0, aiConfig.maxEmbeddingInputChars)
      : trimmed;

    const client = getClient();
    if (!client) return null;

    try {
      const result = await withRetry(
        () =>
          withTimeout(
            client.models.embedContent({
              model,
              contents: input,
              // Do NOT specify outputDimensionality — use model default.
              // Forcing 768 on a 3072-dim model degrades accuracy.
            }),
            8000, // 8s — embedding cold-starts can take 2-4s
          ),
        aiConfig.maxRetries,
        `generateEmbedding(${model})`,
      );

      // SDK v1.x returns embeddings in one of two shapes depending on SDK version.
      // Try both paths defensively.
      let embedding: number[] | undefined;

      // Shape 1: result.embeddings[0].values  (batch response)
      if (Array.isArray(result.embeddings) && result.embeddings.length > 0) {
        embedding = result.embeddings[0]?.values;
      }

      // Shape 2: result.embedding.values  (single-content response)
      if (!embedding || embedding.length === 0) {
        const singleEmb = (result as any).embedding;
        if (singleEmb && Array.isArray(singleEmb.values) && singleEmb.values.length > 0) {
          embedding = singleEmb.values;
        }
      }

      if (!Array.isArray(embedding) || embedding.length === 0) {
        console.error(`${EMBED_PREFIX} Unexpected response shape — no embedding array. ` +
          `Result keys: ${Object.keys(result || {}).join(', ')}`);
        recordFailure(circuitKey);
        return null;
      }

      const elapsed = Date.now() - startMs;
      recordSuccess(circuitKey);
      console.log(`${EMBED_PREFIX} SUCCESS model=${model} dims=${embedding.length} ${elapsed}ms`);
      console.log(`${EMBED_PREFIX} Vector Length: ${embedding.length}`);
      return embedding;
    } catch (err) {
      const elapsed = Date.now() - startMs;
      const message = err instanceof Error ? err.message : String(err);
      recordFailure(circuitKey);

      const isTimeout = message.includes('timed out');
      const is404 = message.includes('404') || message.includes('NOT_FOUND');
      const isQuota = message.includes('429') || message.includes('RESOURCE_EXHAUSTED');

      const code = isTimeout
        ? AIErrorCode.AI_TIMEOUT
        : is404
          ? AIErrorCode.AI_MODEL_UNAVAILABLE
          : AIErrorCode.EMBEDDING_FAILED;

      if (is404) {
        console.error(
          `${EMBED_PREFIX} FAIL model=${model} — MODEL NOT FOUND (404). ` +
          `Check GEMINI_EMBEDDING_MODEL. Valid options: gemini-embedding-001, gemini-embedding-2. ${elapsed}ms`,
        );
      } else if (isQuota) {
        console.error(`${EMBED_PREFIX} FAIL model=${model} — QUOTA EXHAUSTED (429). ${elapsed}ms`);
      } else {
        console.error(`${EMBED_PREFIX} FAIL model=${model} code=${code} ${elapsed}ms: ${message}`);
      }
      return null;
    }
  },

  /**
   * Validate configured models on startup.
   * Logs active model configuration and warns about potential issues.
   * Does NOT block startup — failures are logged, not thrown.
   */
  async healthCheck(): Promise<{ text: boolean; embedding: boolean }> {
    const result = { text: false, embedding: false };

    if (!aiConfig.isConfigured) {
      console.warn(`${LOG_PREFIX} Health check skipped — API key not configured`);
      console.warn(`${LOG_PREFIX} AI features (semantic scoring, LLM enrichment) will be disabled`);
      return result;
    }

    console.log(`${LOG_PREFIX} ─── AI Configuration ───`);
    console.log(`${LOG_PREFIX} Text model active: ${aiConfig.textModel}`);
    console.log(`${LOG_PREFIX} Embedding model active: ${aiConfig.embeddingModel}`);
    console.log(`${LOG_PREFIX} Semantic scoring: ${aiConfig.enableSemanticScoring ? 'enabled' : 'disabled'}`);
    console.log(`${LOG_PREFIX} Max retries: ${aiConfig.maxRetries}`);
    console.log(`${LOG_PREFIX} Timeout: ${aiConfig.timeoutMs}ms`);
    console.log(`${LOG_PREFIX} Circuit breaker: ${aiConfig.circuitBreakerThreshold} failures → ${aiConfig.circuitBreakerCooldownMs}ms cooldown`);

    if (process.env.SKIP_AI_HEALTH_CHECK === 'true') {
      console.warn(`${LOG_PREFIX} Health check bypassed via SKIP_AI_HEALTH_CHECK=true`);
      result.text = true;
      result.embedding = aiConfig.enableSemanticScoring;
      return result;
    }

    // Quick validation: try a minimal text generation
    try {
      const testResult = await this.generateText('Respond with exactly: OK');
      if (testResult) {
        result.text = true;
        console.log(`${LOG_PREFIX} ✓ Text model validated: ${aiConfig.textModel}`);
      } else {
        console.warn(`${LOG_PREFIX} ✗ Text model returned empty response: ${aiConfig.textModel}`);
      }
    } catch {
      console.warn(`${LOG_PREFIX} ✗ Text model validation failed: ${aiConfig.textModel}`);
    }

    // Embedding model validation removed from startup to minimize API calls and prevent
    // quota exhaustion on free-tier Gemini API.
    result.embedding = aiConfig.enableSemanticScoring;

    console.log(`${LOG_PREFIX} ─── Health check complete ───`);
    return result;
  },

  /**
   * Get current circuit breaker status for monitoring.
   */
  getCircuitStatus(): Record<string, { failures: number; isOpen: boolean }> {
    const status: Record<string, { failures: number; isOpen: boolean }> = {};
    for (const [key, state] of Object.entries(circuitBreakers)) {
      status[key] = { failures: state.failures, isOpen: state.isOpen };
    }
    return status;
  },
};
