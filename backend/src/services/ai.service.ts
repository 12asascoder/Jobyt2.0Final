/**
 * AI Service — Provider-agnostic facade
 *
 * Provides a stable public API for all AI operations:
 *   - generateText()      → Groq-powered text generation with retry + timeout
 *   - generateJSON()      → Groq JSON generation (structured output mode)
 *   - generateEmbedding() → HuggingFace-powered embedding (for semantic ATS scoring)
 *   - healthCheck()       → Model validation on startup
 *   - getCircuitStatus()  → Circuit breaker state for monitoring
 *
 * Text generation:  Groq API  (GROQ_API_KEY)
 * Embeddings:       HuggingFace Inference API (HF_API_KEY / HUGGINGFACE_API_KEY, optional — falls back gracefully)
 *
 * All public methods return null on failure (never throw),
 * allowing callers to degrade gracefully.
 *
 * Retry policy:
 *   - Fast-fail (no retry) on: 429 (quota exhausted), 400 (invalid request/key),
 *     404 (model not found). These are permanent failures.
 *   - Retry on: network timeout, 500, 503 (transient infrastructure failures).
 */

import { aiConfig } from '../config/ai.config';
import { AIProvider } from './ai/interfaces/aiProvider.interface';
import { GroqProvider } from './ai/providers/groq.provider';
import { GrokProvider } from './ai/providers/grok.provider';
import { ClaudeProvider } from './ai/providers/claude.provider';
import { OllamaProvider } from './ai/providers/ollama.provider';
import { EmbeddingProviderResolver } from './ai/providers/embedding.provider';
import { AIResponseCache } from './ai/aiResponseCache.service';
import { AIUsageTracker } from './ai/aiUsageTracker.service';

const LOG_PREFIX = '[AI]';
const EMBED_PREFIX = '[Embedding]';

// Flag to track if we've hit an authentication failure (invalid API key)
let isAuthFailed = false;

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

function tripCircuit(key: string): void {
  const cb = getCircuitBreaker(key);
  cb.failures = aiConfig.circuitBreakerThreshold;
  cb.isOpen = true;
  cb.lastFailureAt = Date.now();
  console.warn(
    `${LOG_PREFIX} Circuit breaker FORCED OPEN for "${key}" due to authentication failure.`,
  );
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

function isAuthError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('invalid_api_key') ||
    msg.includes('api_key_invalid') ||
    msg.includes('invalid api key') ||
    msg.includes('unauthorized')
  );
}

/**
 * Returns true for permanent API errors that should NOT be retried.
 * Retrying these wastes quota and adds latency with no chance of success.
 */
function isPermanentError(message: string): boolean {
  if (isAuthError(message)) {
    return true;
  }
  return (
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('Quota exceeded') ||
    message.includes('rate_limit_exceeded') ||
    // 404 Model not found — model name is wrong, retry won't help
    message.includes('404') ||
    message.includes('NOT_FOUND') ||
    message.includes('model_not_found') ||
    // 400 Invalid argument / bad API key — config error, retry won't help
    (message.includes('400') && (
      message.includes('INVALID_ARGUMENT') ||
      message.includes('API_KEY_INVALID') ||
      message.includes('API key not valid') ||
      message.includes('invalid_api_key')
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

      if (isPermanentError(lastError.message)) {
        const isAuth = isAuthError(lastError.message);
        const reason = isAuth ? 'AUTHENTICATION_FAILED'
          : lastError.message.includes('429') ? 'QUOTA_EXHAUSTED'
          : lastError.message.includes('404') || lastError.message.includes('NOT_FOUND') || lastError.message.includes('model_not_found') ? 'MODEL_NOT_FOUND'
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

// ── Groq Provider (text generation) ─────────────────────────────────────────

let groqProvider: AIProvider | null = null;

function getGroqProvider(): AIProvider | null {
  if (!aiConfig.isConfigured || !aiConfig.groqApiKey) return null;
  if (!groqProvider) {
    groqProvider = new GroqProvider(
      aiConfig.groqApiKey,
      aiConfig.textModel,
      aiConfig.defaultTemperature,
    );
  }
  return groqProvider;
}

let grokProvider: AIProvider | null = null;
function getGrokProvider(): AIProvider | null {
  if (!aiConfig.xaiApiKey) return null;
  if (!grokProvider) {
    grokProvider = new GrokProvider(
      aiConfig.xaiApiKey,
      aiConfig.xaiModel,
      aiConfig.defaultTemperature,
    );
  }
  return grokProvider;
}

let claudeProvider: AIProvider | null = null;
function getClaudeProvider(): AIProvider | null {
  if (!aiConfig.anthropicApiKey) return null;
  if (!claudeProvider) {
    claudeProvider = new ClaudeProvider(
      aiConfig.anthropicApiKey,
      aiConfig.anthropicModel,
      aiConfig.defaultTemperature,
    );
  }
  return claudeProvider;
}

let ollamaProvider: AIProvider | null = null;
function getOllamaProvider(): AIProvider | null {
  if (!aiConfig.ollamaConfigured || !aiConfig.ollamaBaseUrl) return null;
  if (!ollamaProvider) {
    ollamaProvider = new OllamaProvider(
      aiConfig.ollamaBaseUrl,
      aiConfig.ollamaModel,
      aiConfig.defaultTemperature,
    );
  }
  return ollamaProvider;
}

export function resolveProvider(
  requestedProvider?: 'grok' | 'groq' | 'claude' | 'ollama',
): 'grok' | 'groq' | 'claude' | 'ollama' {
  const env = process.env.NODE_ENV;

  if (env === 'production') {
    if (requestedProvider) {
      return requestedProvider;
    }
    return 'claude';
  }

  if (env === 'test') {
    if (requestedProvider) {
      return requestedProvider;
    }
    return 'groq'; // preserve compatibility for existing mock tests
  }

  // development / other local environment
  if (aiConfig.isConfigured) {
    return 'groq';
  } else if (aiConfig.ollamaConfigured) {
    return 'ollama';
  } else {
    return 'claude';
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export const AIService = {
  /**
   * Generate text content using the configured text model (Groq).
   * Returns the raw text response, or null on any failure.
   */
  async generateText(
    prompt: string,
    options?: { temperature?: number; responseMimeType?: string; provider?: 'grok' | 'groq' | 'claude' | 'ollama'; module?: string; userId?: string },
  ): Promise<string | null> {
    const providerChoice = options?.provider;
    const resolvedProvider = resolveProvider(providerChoice);
    const model =
      resolvedProvider === 'grok'
        ? aiConfig.xaiModel
        : resolvedProvider === 'claude'
        ? aiConfig.anthropicModel
        : resolvedProvider === 'ollama'
        ? aiConfig.ollamaModel
        : aiConfig.textModel;
    const circuitKey = `text:${resolvedProvider}:${model}`;
    const startMs = Date.now();
    const moduleName = options?.module || 'system';

    // 1. Check Cache
    const cacheKey = AIResponseCache.generateKey(moduleName, prompt, model);
    const cachedResponse = await AIResponseCache.getCache(cacheKey);
    if (cachedResponse) {
      console.log(`${LOG_PREFIX} Cache HIT for ${moduleName}:${model}`);
      
      // Async log usage for cache hit
      AIUsageTracker.logUsage({
        userId: options?.userId,
        module: moduleName,
        modelName: model,
        latencyMs: Date.now() - startMs,
        isCacheHit: true,
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: Math.ceil(String(cachedResponse).length / 4)
      }).catch(() => {});

      return cachedResponse;
    }
 
    // Allow provider-specific availability
    if (isCircuitOpen(circuitKey)) {
      console.warn(`${LOG_PREFIX} Circuit OPEN for ${model} — skipping text generation`);
      return null;
    }
 
    let provider: AIProvider | null = null;
    if (resolvedProvider === 'grok') {
      provider = getGrokProvider();
    } else if (resolvedProvider === 'claude') {
      provider = getClaudeProvider();
    } else if (resolvedProvider === 'ollama') {
      provider = getOllamaProvider();
    } else {
      provider = getGroqProvider();
    }
    if (!provider) {
      console.warn(`${LOG_PREFIX} No provider configured for choice=${resolvedProvider}`);
      return null;
    }

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
            provider!.generateText({
              prompt,
              temperature: options?.temperature ?? aiConfig.defaultTemperature,
              responseMimeType: options?.responseMimeType,
            }),
            aiConfig.timeoutMs > 0 ? Math.min(aiConfig.timeoutMs, 30000) : 30000,
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

      // 2. Set Cache
      AIResponseCache.setCache(cacheKey, text).catch(() => {});

      // 3. Log Usage
      AIUsageTracker.logUsage({
        userId: options?.userId,
        module: moduleName,
        modelName: model,
        latencyMs: elapsed,
        isCacheHit: false,
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: Math.ceil(text.length / 4)
      }).catch(() => {});

      return text;
    } catch (err: any) {
      const elapsed = Date.now() - startMs;
      const message = err instanceof Error ? err.message : String(err);
      
      const isAuth = isAuthError(message);
      if (isAuth) {
        isAuthFailed = true;
        const authProvider =
          resolvedProvider === 'grok'
            ? 'Grok'
            : resolvedProvider === 'claude'
            ? 'Claude'
            : resolvedProvider === 'ollama'
            ? 'Ollama'
            : 'Groq';
        console.warn(
          `${LOG_PREFIX} ${authProvider} Authentication Failed: Invalid API Key. Please verify ${
            resolvedProvider === 'grok'
              ? 'XAI_API_KEY'
              : resolvedProvider === 'claude'
              ? 'ANTHROPIC_API_KEY'
              : resolvedProvider === 'ollama'
              ? 'OLLAMA_BASE_URL'
              : 'GROQ_API_KEY'
          } in .env.`,
        );
        tripCircuit(circuitKey);
      } else {
        recordFailure(circuitKey);
      }

      // Classify error
      const isTimeout = message.includes('timed out');
      const is404 = message.includes('404') || message.includes('NOT_FOUND') || message.includes('model_not_found');
      const code = isAuth
        ? AIErrorCode.AI_NOT_CONFIGURED
        : isTimeout
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
   * Generate a JSON-parsed response from the text model (Groq).
   * Uses response_format: { type: 'json_object' } for structured output.
   * Returns null on failure or parse error.
   */
  async generateJSON<T = unknown>(
    prompt: string,
    options?: { provider?: 'grok' | 'groq' | 'claude' | 'ollama'; module?: string; userId?: string }
  ): Promise<T | null> {
    // Backwards-compatible: default to configured text provider (Groq).
    const raw = await this.generateText(prompt, {
      responseMimeType: 'application/json',
      provider: options?.provider,
      module: options?.module,
      userId: options?.userId,
    });

    if (!raw) return null;

    try {
      let cleanText = raw.trim();
      // Strip markdown code fences if present (some models add them even in JSON mode)
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

  /**
   * Generate an embedding vector for a given text.
   *
   * Uses HuggingFace (sentence-transformers/all-MiniLM-L6-v2 or configured EMBEDDING_MODEL).
   * Supports unauthenticated/free tier usage as well as key-based authenticated calls.
   *
   * Returns null on failure (never throws).
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    const model = aiConfig.embeddingModel;
    const providerName = aiConfig.embeddingProvider;
    const circuitKey = `embedding:${providerName}:${model}`;
    const startMs = Date.now();

    if (!aiConfig.embeddingsConfigured) {
      // Graceful degradation — keyword scoring will be used instead
      return null;
    }

    if (!aiConfig.enableSemanticScoring) {
      return null;
    }

    if (isCircuitOpen(circuitKey)) {
      console.warn(`${EMBED_PREFIX} Circuit OPEN for ${providerName}:${model} — skipping embedding`);
      return null;
    }

    const trimmed = text.trim();
    if (!trimmed) return null;

    const input = trimmed.length > aiConfig.maxEmbeddingInputChars
      ? trimmed.slice(0, aiConfig.maxEmbeddingInputChars)
      : trimmed;

    const provider = EmbeddingProviderResolver.resolve();
    if (!provider) return null;

    try {
      const embedding = await withRetry(
        () =>
          withTimeout(
            provider.generateEmbedding(input),
            15000, // 15s — Hugging Face inference or OpenAI can take a moment
          ),
        aiConfig.maxRetries,
        `generateEmbedding(${providerName}:${model})`,
      );

      if (!Array.isArray(embedding) || embedding.length === 0) {
        console.error(`${EMBED_PREFIX} Unexpected response shape — no embedding array.`);
        recordFailure(circuitKey);
        return null;
      }

      const elapsed = Date.now() - startMs;
      recordSuccess(circuitKey);
      console.log(`${EMBED_PREFIX} SUCCESS provider=${providerName} model=${model} dims=${embedding.length} ${elapsed}ms`);
      return embedding;
    } catch (err: any) {
      const elapsed = Date.now() - startMs;
      const message = err instanceof Error ? err.message : String(err);
      
      const isAuth = isAuthError(message);
      if (isAuth) {
        console.warn(`${EMBED_PREFIX} Authentication Failed: Invalid credentials for ${providerName}.`);
        tripCircuit(circuitKey);
      } else {
        recordFailure(circuitKey);
      }

      const isTimeout = message.includes('timed out');
      const is404 = message.includes('404') || message.includes('NOT_FOUND');
      const isQuota = message.includes('429') || message.includes('RESOURCE_EXHAUSTED');

      const code = isAuth
        ? AIErrorCode.AI_NOT_CONFIGURED
        : isTimeout
          ? AIErrorCode.AI_TIMEOUT
          : is404
            ? AIErrorCode.AI_MODEL_UNAVAILABLE
            : AIErrorCode.EMBEDDING_FAILED;

      if (is404) {
        console.error(
          `${EMBED_PREFIX} FAIL provider=${providerName} model=${model} — MODEL NOT FOUND (404). ${elapsed}ms`,
        );
      } else if (isQuota) {
        console.error(`${EMBED_PREFIX} FAIL provider=${providerName} model=${model} — QUOTA EXHAUSTED (429). ${elapsed}ms`);
      } else {
        console.error(`${EMBED_PREFIX} FAIL provider=${providerName} model=${model} code=${code} ${elapsed}ms: ${message}`);
      }
      return null;
    }
  },

  async healthCheck(): Promise<{ text: boolean; embedding: boolean }> {
    const result = { text: false, embedding: false };

    console.log(`${LOG_PREFIX} ─── AI Configuration ───`);
    console.log(`${LOG_PREFIX} Text provider:         Groq`);
    console.log(`${LOG_PREFIX} Text model:            ${aiConfig.textModel}`);
    console.log(`${LOG_PREFIX} Text configured:       ${aiConfig.isConfigured}`);
    console.log(`${LOG_PREFIX} Claude model:          ${aiConfig.anthropicModel}`);
    console.log(`${LOG_PREFIX} Claude configured:     ${aiConfig.anthropicConfigured}`);
    console.log(`${LOG_PREFIX} Embedding provider:    ${aiConfig.embeddingProvider}`);
    console.log(`${LOG_PREFIX} Embedding model:       ${aiConfig.embeddingModel}`);
    console.log(`${LOG_PREFIX} Embeddings configured: ${aiConfig.embeddingsConfigured}`);
    console.log(`${LOG_PREFIX} Semantic scoring:      ${aiConfig.enableSemanticScoring ? 'enabled' : 'disabled'}`);
    console.log(`${LOG_PREFIX} Max retries:           ${aiConfig.maxRetries}`);
    console.log(`${LOG_PREFIX} Timeout:               ${aiConfig.timeoutMs}ms`);
    console.log(`${LOG_PREFIX} Circuit breaker:       ${aiConfig.circuitBreakerThreshold} failures → ${aiConfig.circuitBreakerCooldownMs}ms cooldown`);

    if (!aiConfig.isConfigured) {
      console.warn(`${LOG_PREFIX} Health check skipped — GROQ_API_KEY not configured`);
      console.warn(`${LOG_PREFIX} AI reasoning features (strengths/weaknesses) will be disabled`);
      return result;
    }

    if (process.env.SKIP_AI_HEALTH_CHECK === 'true') {
      result.text = true;
      result.embedding = aiConfig.embeddingsConfigured && aiConfig.enableSemanticScoring;
      return result;
    }

    if (isAuthFailed) {
      console.warn(`${LOG_PREFIX} ✗ Text model validation failed: Authentication Error (Invalid API Key). ` +
        `Please check GROQ_API_KEY in your .env file.`);
      return result;
    }

    // Quick validation: try a minimal text generation via Groq
    try {
      const testResult = await this.generateText('Respond with exactly: OK');
      if (testResult) {
        result.text = true;
        console.log(`${LOG_PREFIX} ✓ Text model validated: ${aiConfig.textModel} (Groq)`);
      } else {
        if (isAuthFailed) {
          console.warn(`${LOG_PREFIX} ✗ Text model validation failed: Authentication Error (Invalid API Key). ` +
            `Please check GROQ_API_KEY in your .env file.`);
        } else {
          console.warn(`${LOG_PREFIX} ✗ Text model returned empty response: ${aiConfig.textModel}`);
        }
      }
    } catch {
      console.warn(`${LOG_PREFIX} ✗ Text model validation failed: ${aiConfig.textModel}`);
    }

    // Embedding model validation is skipped on startup to prevent quota exhaustion.
    // Embeddings will be validated lazily on the first ATS scoring request.
    result.embedding = aiConfig.embeddingsConfigured && aiConfig.enableSemanticScoring;

    console.log(`${LOG_PREFIX} ─── Health check complete ───`);
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
