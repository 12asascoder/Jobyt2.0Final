/**
 * Centralized AI Configuration
 *
 * Single source of truth for all AI/Gemini-related configuration.
 * Reads from environment variables with sensible defaults.
 *
 * Environment variables:
 *   NVIDIA_API_KEY              - Required for AI features
 *   NVIDIA_TEXT_MODEL           - Text generation model (default: meta/llama-3.1-70b-instruct)
 *   NVIDIA_EMBEDDING_MODEL     - Embedding model (default: nvidia/nv-embedqa-e5-v5)
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
  /** OpenRouter API key */
  openRouterApiKey: string | null;
  /** Whether the API key is configured and valid */
  isConfigured: boolean;
  /** Text generation model name */
  textModel: string;
  /** OpenRouter model name */
  openRouterModel: string;
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
  const apiKey = process.env.NVIDIA_API_KEY || null;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY || null;
  const isConfigured = Boolean(
    (apiKey && apiKey !== 'your_nvidia_api_key_here') || 
    (openRouterApiKey && openRouterApiKey !== 'your_openrouter_api_key_here')
  );

  const config: AIConfig = {
    apiKey: apiKey && apiKey !== 'your_nvidia_api_key_here' ? apiKey : null,
    openRouterApiKey: openRouterApiKey && openRouterApiKey !== 'your_openrouter_api_key_here' ? openRouterApiKey : null,
    isConfigured,
    textModel: process.env.NVIDIA_TEXT_MODEL || 'meta/llama-3.1-70b-instruct',
    openRouterModel: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free',
    embeddingModel: process.env.NVIDIA_EMBEDDING_MODEL || 'nvidia/nv-embedqa-e5-v5',
    enableSemanticScoring: process.env.ENABLE_SEMANTIC_SCORING !== 'false',
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '2', 10),
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
    circuitBreakerThreshold: parseInt(process.env.AI_CIRCUIT_BREAKER_THRESHOLD || '5', 10),
    circuitBreakerCooldownMs: parseInt(process.env.AI_CIRCUIT_BREAKER_COOLDOWN_MS || '60000', 10),
    maxEmbeddingInputChars: 8000,
    defaultTemperature: 0.1,
  };

  if (!isConfigured) {
    console.warn(`${LOG_PREFIX} Neither NVIDIA_API_KEY nor OPENROUTER_API_KEY is configured — AI features will be disabled`);
  }

  return config;
}

/** Singleton AI configuration, loaded once at module import. */
export const aiConfig = loadAIConfig();
