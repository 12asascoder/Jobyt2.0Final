/**
 * Gemini Utility — Backward-compatible wrapper
 *
 * Migrated from @google/generative-ai to @google/genai SDK.
 * All consumers continue to import { generateJsonContent } from './gemini'
 * and { getGeminiClient } from './gemini' — no breaking changes.
 *
 * Actual AI logic now lives in services/ai.service.ts.
 */

import { AIService } from '../services/ai.service';
import { aiConfig } from '../config/ai.config';

const LOG_PREFIX = '[Gemini]';

/**
 * Check whether the Gemini AI client is configured.
 *
 * @deprecated Prefer using AIService directly. Kept for backward compatibility
 * with embedding.ts and other consumers.
 *
 * Returns a truthy sentinel object if configured, null otherwise.
 * Callers only use this for null-checks, never access SDK methods directly.
 */
export function getGeminiClient(): { configured: true } | null {
  if (!aiConfig.isConfigured) {
    return null;
  }
  return { configured: true };
}

/**
 * Generate JSON content using Gemini.
 * Tries to parse the output securely.
 *
 * Preserves the exact same signature and behavior as the original:
 *   - Returns parsed JSON of type T, or null on any failure
 *   - Never throws
 *   - Logs with [Gemini] prefix
 */
export async function generateJsonContent<T = any>(prompt: string): Promise<T | null> {
  if (!aiConfig.isConfigured) {
    console.warn(`${LOG_PREFIX} GEMINI_API_KEY missing, skipping generation`);
    return null;
  }

  try {
    const result = await AIService.generateJSON<T>(prompt);

    if (result) {
      console.log(`${LOG_PREFIX} OK model=${aiConfig.textModel} (JSON parsed successfully)`);
    }

    return result;
  } catch (err) {
    console.error(`${LOG_PREFIX} Generation failed:`, err);
    return null;
  }
}
