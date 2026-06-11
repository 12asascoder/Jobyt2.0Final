/**
 * AI Service — Singleton client for NVIDIA NIM API
 *
 * Provides:
 *   - generateText()      → text generation with retry + timeout
 *   - generateEmbedding() → embedding generation with retry + timeout
 *   - healthCheck()       → model validation
 *   - Circuit breaker to prevent repeated failing calls
 *   - Structured error codes
 *
 * All public methods return null on failure (never throw),
 * allowing callers to degrade gracefully.
 */

import axios from 'axios';
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

function isPermanentError(message: string): boolean {
  return (
    message.includes('429') ||
    message.includes('404') ||
    message.includes('401') ||
    message.includes('400')
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

      if (isPermanentError(lastError.message)) {
        console.error(`${LOG_PREFIX} ${label} permanent failure — short-circuiting retries.`);
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

// ── Axios Client ─────────────────────────────────────────────────────────────

function getAxiosConfig(type: 'nvidia' | 'openrouter' = 'nvidia') {
  if (type === 'openrouter') {
    if (!aiConfig.openRouterApiKey) return null;
    return {
      headers: {
        'Authorization': `Bearer ${aiConfig.openRouterApiKey}`,
        'Content-Type': 'application/json'
      }
    };
  }
  if (!aiConfig.apiKey) return null;
  return {
    headers: {
      'Authorization': `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json'
    }
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export const AIService = {
  async generateText(
    prompt: string,
    options?: { temperature?: number; responseMimeType?: string },
  ): Promise<string | null> {
    const useOpenRouter = Boolean(aiConfig.openRouterApiKey);
    const model = useOpenRouter ? aiConfig.openRouterModel : aiConfig.textModel;
    const url = useOpenRouter ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://integrate.api.nvidia.com/v1/chat/completions';

    const circuitKey = `text:${model}`;
    const startMs = Date.now();

    if (!aiConfig.isConfigured) return null;
    if (isCircuitOpen(circuitKey)) return null;

    const axiosConfig = getAxiosConfig(useOpenRouter ? 'openrouter' : 'nvidia');
    if (!axiosConfig) return null;

    try {
      const payload: any = {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? aiConfig.defaultTemperature,
      };

      if (options?.responseMimeType === 'application/json') {
        payload.response_format = { type: 'json_object' };
      }

      const result = await withRetry(
        () =>
          withTimeout(
            axios.post(url, payload, axiosConfig),
            aiConfig.timeoutMs,
          ),
        aiConfig.maxRetries,
        `generateText(${model})`,
      );

      const text = result.data?.choices?.[0]?.message?.content;
      if (!text) {
        console.warn(`${LOG_PREFIX} Empty response from ${model}`);
        recordFailure(circuitKey);
        return null;
      }

      const elapsed = Date.now() - startMs;
      recordSuccess(circuitKey);
      console.log(`${LOG_PREFIX} Text OK model=${model} len=${text.length} ${elapsed}ms`);
      return text;
    } catch (err: any) {
      const elapsed = Date.now() - startMs;
      const message = err.response ? JSON.stringify(err.response.data) : err.message;
      recordFailure(circuitKey);

      const code = message.includes('timed out') ? AIErrorCode.AI_TIMEOUT : AIErrorCode.INVALID_AI_RESPONSE;
      console.error(`${LOG_PREFIX} Text FAIL model=${model} code=${code} ${elapsed}ms: ${message}`);
      return null;
    }
  },

  async generateJSON<T = unknown>(prompt: string): Promise<T | null> {
    const raw = await this.generateText(prompt, {
      responseMimeType: 'application/json',
    });

    if (!raw) return null;

    try {
      let cleanText = raw.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```/, '').replace(/```$/, '').trim();
      }
      return JSON.parse(cleanText) as T;
    } catch {
      console.error(`${LOG_PREFIX} JSON parse failed:`, raw.slice(0, 200));
      return null;
    }
  },

  async generateEmbedding(text: string): Promise<number[] | null> {
    const model = aiConfig.embeddingModel;
    const circuitKey = `embedding:${model}`;
    const startMs = Date.now();

    if (!aiConfig.isConfigured || !aiConfig.enableSemanticScoring) return null;
    if (isCircuitOpen(circuitKey)) return null;

    const trimmed = text.trim();
    if (!trimmed) return null;

    const input = trimmed.length > aiConfig.maxEmbeddingInputChars
      ? trimmed.slice(0, aiConfig.maxEmbeddingInputChars)
      : trimmed;

    const axiosConfig = getAxiosConfig();
    if (!axiosConfig) return null;

    try {
      const result = await withRetry(
        () =>
          withTimeout(
            axios.post('https://integrate.api.nvidia.com/v1/embeddings', {
              model,
              input: [input],
              input_type: 'passage'
            }, axiosConfig),
            aiConfig.timeoutMs,
          ),
        aiConfig.maxRetries,
        `generateEmbedding(${model})`,
      );

      const embedding = result.data?.data?.[0]?.embedding;

      if (!Array.isArray(embedding) || embedding.length === 0) {
        console.error(`${EMBED_PREFIX} Unexpected response shape.`);
        recordFailure(circuitKey);
        return null;
      }

      const elapsed = Date.now() - startMs;
      recordSuccess(circuitKey);
      console.log(`${EMBED_PREFIX} SUCCESS model=${model} dims=${embedding.length} ${elapsed}ms`);
      return embedding;
    } catch (err: any) {
      const elapsed = Date.now() - startMs;
      const message = err.response ? JSON.stringify(err.response.data) : err.message;
      recordFailure(circuitKey);

      const code = message.includes('timed out') ? AIErrorCode.AI_TIMEOUT : AIErrorCode.EMBEDDING_FAILED;
      console.error(`${EMBED_PREFIX} FAIL model=${model} code=${code} ${elapsed}ms: ${message}`);
      return null;
    }
  },

  async healthCheck(): Promise<{ text: boolean; embedding: boolean }> {
    const result = { text: false, embedding: false };

    if (!aiConfig.isConfigured) {
      console.warn(`${LOG_PREFIX} Health check skipped — API key not configured`);
      return result;
    }

    if (process.env.SKIP_AI_HEALTH_CHECK === 'true') {
      result.text = true;
      result.embedding = aiConfig.enableSemanticScoring;
      return result;
    }

    try {
      const testResult = await this.generateText('Respond with exactly: OK');
      if (testResult) result.text = true;
    } catch {}

    result.embedding = aiConfig.enableSemanticScoring;
    return result;
  },

  getCircuitStatus(): Record<string, { failures: number; isOpen: boolean }> {
    const status: Record<string, { failures: number; isOpen: boolean }> = {};
    for (const [key, state] of Object.entries(circuitBreakers)) {
      status[key] = { failures: state.failures, isOpen: state.isOpen };
    }
    return status;
  },
};
