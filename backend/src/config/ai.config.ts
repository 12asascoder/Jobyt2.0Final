/**
 * Centralized AI Configuration
 *
 * Single source of truth for all AI/Gemini-related configuration.
 * Reads from environment variables with sensible defaults.
 *
 * Environment variables:
 *   GEMINI_API_KEY              - Required for AI features
 *   GEMINI_TEXT_MODEL           - Text generation model (default: gemini-2.0-flash)
 *   GEMINI_EMBEDDING_MODEL     - Embedding model (default: gemini-embedding-001)
 *   ENABLE_SEMANTIC_SCORING    - Toggle semantic scoring (default: true)
 *   AI_MAX_RETRIES             - Max retry attempts (default: 2)
 *   AI_TIMEOUT_MS              - Request timeout in ms (default: 30000)
 *   AI_CIRCUIT_BREAKER_THRESHOLD - Failures before circuit opens (default: 5)
 *   AI_CIRCUIT_BREAKER_COOLDOWN_MS - Cooldown after circuit opens (default: 60000)
 */

const LOG_PREFIX = '[AI Config]';

export interface AIConfig {
  /** Gemini API key */
  apiKey: string | null;
  /** Whether the API key is configured and valid */
  isConfigured: boolean;
  /** Text generation model name */
  textModel: string;
  /** Embedding model name */
  embeddingModel: string;
  /** Whether semantic scoring is enabled */
  enableSemanticScoring: boolean;
  /** Maximum retry attempts for failed API calls */
  maxRetries: number;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Number of failures before circuit breaker opens */
  circuitBreakerThreshold: number;
  /** Cooldown period after circuit breaker opens (ms) */
  circuitBreakerCooldownMs: number;
  /** Maximum input characters for embedding text */
  maxEmbeddingInputChars: number;
  /** Temperature for text generation */
  defaultTemperature: number;
}

function loadAIConfig(): AIConfig {
  const apiKey = process.env.GEMINI_API_KEY || null;
  const isConfigured = Boolean(apiKey && apiKey !== 'your_gemini_api_key_here');

  const config: AIConfig = {
    apiKey: isConfigured ? apiKey : null,
    isConfigured,
    textModel: process.env.GEMINI_TEXT_MODEL || 'gemini-2.0-flash',
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    enableSemanticScoring: process.env.ENABLE_SEMANTIC_SCORING !== 'false',
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '2', 10),
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
    circuitBreakerThreshold: parseInt(process.env.AI_CIRCUIT_BREAKER_THRESHOLD || '5', 10),
    circuitBreakerCooldownMs: parseInt(process.env.AI_CIRCUIT_BREAKER_COOLDOWN_MS || '60000', 10),
    maxEmbeddingInputChars: 8000,
    defaultTemperature: 0.1,
  };

  if (!isConfigured) {
    console.warn(`${LOG_PREFIX} GEMINI_API_KEY is not configured — AI features will be disabled`);
  }

  return config;
}

/** Singleton AI configuration, loaded once at module import. */
export const aiConfig = loadAIConfig();
