/**
 * SkillMatchingService
 *
 * THE single authoritative skill matching engine for the entire platform.
 *
 * Used by:
 *   - ATSService (resume-to-job ATS scoring)
 *   - JobService.calculateMatchScore (match score API)
 *   - ApplicationService (recruiter ranking + detail page enrichment)
 *
 * Design principles:
 *   - Deterministic: identical inputs → identical outputs. No randomness.
 *   - Normalization-first: both sides normalized before any comparison.
 *   - Priority order: exact match → alias/taxonomy match → Jaro-Winkler fuzzy.
 *   - Duplicate prevention: each required skill matched at most once;
 *     each candidate skill consumed at most once.
 *   - Performance: `natural` loaded once at module level, not per call.
 *     Normalization cache prevents repeated work on the same string.
 */

import { normalizeSkill } from '../../config/skillTaxonomy';

 
type JWFn = (s1: string, s2: string, opts?: any) => number;

// Load `natural` once at module level — avoids per-call require() overhead.
// Wrapped in a function to give TypeScript a stable, callable type that
// won't be narrowed to `never` inside conditional blocks.
function makeJaroWinkler(): JWFn | null {
  try {
     
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const natural = require('natural');
    if (typeof natural?.JaroWinklerDistance === 'function') {
      return natural.JaroWinklerDistance as JWFn;
    }
  } catch {
    console.warn('[SkillMatchingService] `natural` package unavailable — fuzzy matching disabled');
  }
  return null;
}

const _JaroWinkler: JWFn | null = makeJaroWinkler();

const LOG_PREFIX = '[SkillMatchingService]';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface FuzzyMatch {
  candidate: string;
  required: string;
  similarity: number;
}

export interface FuzzyMatchDetail {
  candidateSkill: string;
  requiredSkill: string;
  score: number;
}

export interface SkillMatchResult {
  /** 0–100: percentage of required skills that were matched */
  matchPercentage: number;
  matchScore: number; // For backward compatibility with HEAD (unifiedMatch.service.ts, etc.)
  /** Required skills that were matched (using original casing from requiredSkills) */
  matchedSkills: string[];
  /** Required skills that were NOT matched */
  missingSkills: string[];
  /** Fuzzy matches with similarity score, for explainability */
  fuzzyMatchedSkills: FuzzyMatch[];
  fuzzyMatches: FuzzyMatchDetail[]; // For backward compatibility with HEAD
}

export interface SkillMatchOptions {
  /**
   * Jaro-Winkler similarity threshold for fuzzy matching.
   * @default 0.85
   */
  fuzzyThreshold?: number;
}

// ─── Internal normalization ───────────────────────────────────────────────────

/**
 * Normalize a skill string for comparison:
 *   1. Delegate to skillTaxonomy.normalizeSkill() (alias resolution)
 *   2. Lowercase + trim
 *   3. Collapse internal whitespace
 *
 * This is intentionally NOT exported — callers use the public service methods.
 */
function normalize(skill: string): string {
  if (!skill || typeof skill !== 'string') return '';
  // First pass: resolve aliases via taxonomy (e.g. "reactjs" → "React")
  const aliasResolved = normalizeSkill(skill.trim());
  // Second pass: lowercase + collapse whitespace for comparison key
  return aliasResolved.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Deduplicate a string array, preserving first occurrence.
 */
function dedup(skills: string[]): string[] {
  const seen = new Set<string>();
  return skills.filter((s) => {
    const k = s.toLowerCase().trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ─── Main service ─────────────────────────────────────────────────────────────

export const SkillMatchingService = {
  /**
   * Calculate the skill match between a candidate and a job.
   *
   * Matching strategy (in priority order):
   *   1. Exact normalized match (e.g. "react" === "react")
   *   2. Taxonomy alias match (e.g. "reactjs" → "React" === "react")
   *      — This is already handled by `normalize()` calling `normalizeSkill()`
   *   3. Jaro-Winkler fuzzy match with configurable threshold (default 0.85)
   *      (e.g. "Node" ↔ "Node.js", "Postgres" ↔ "PostgreSQL")
   *
   * Duplicate prevention:
   *   - Each REQUIRED skill is matched at most once.
   *   - Each CANDIDATE skill can match at most one required skill.
   *
   * @param candidateSkills - Skills from candidate profile or parsed resume
   * @param requiredSkills  - Skills required by the job posting
   * @param options         - Optional config (fuzzy threshold)
   * @returns               SkillMatchResult with percentage and explainability
   */
  calculateSkillMatch(
    candidateSkills: string[],
    requiredSkills: string[],
    options: SkillMatchOptions = {},
  ): SkillMatchResult {
    const threshold = options.fuzzyThreshold ?? 0.85;

    // Guard: empty inputs
    if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
      return {
        matchPercentage: 0,
        matchScore: candidateSkills && candidateSkills.length > 0 ? 100 : 0,
        matchedSkills: [],
        missingSkills: [],
        fuzzyMatchedSkills: [],
        fuzzyMatches: [],
      };
    }
    if (!Array.isArray(candidateSkills)) {
      candidateSkills = [];
    }

    // Deduplicate + normalize required skills
    const uniqueRequired = dedup(requiredSkills.filter((s) => s && s.trim()));
    const uniqueCandidate = dedup(candidateSkills.filter((s) => s && s.trim()));

    // Pre-normalize candidate skills into a map: normalizedKey → original string
    // This avoids re-normalizing inside the inner loop.
    const candidateNormMap = new Map<string, string>();
    for (const cSkill of uniqueCandidate) {
      const key = normalize(cSkill);
      if (key && !candidateNormMap.has(key)) {
        candidateNormMap.set(key, cSkill);
      }
    }

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    const fuzzyMatchedSkills: FuzzyMatch[] = [];
    const fuzzyMatches: FuzzyMatchDetail[] = [];

    // Track which candidate normalized keys are already consumed
    const usedCandidateKeys = new Set<string>();

    for (const reqSkill of uniqueRequired) {
      const reqNorm = normalize(reqSkill);
      if (!reqNorm) {
        missingSkills.push(reqSkill);
        continue;
      }

      let matched = false;

      // ── Pass 1: exact normalized match ──────────────────────────────────────
      if (candidateNormMap.has(reqNorm) && !usedCandidateKeys.has(reqNorm)) {
        usedCandidateKeys.add(reqNorm);
        matchedSkills.push(reqSkill);
        matched = true;
      }

      // ── Pass 2: Jaro-Winkler fuzzy match ────────────────────────────────────
      const jaroWinkler = _JaroWinkler;
      if (!matched && jaroWinkler) {
        let bestSimilarity = 0;
        let bestCandidateKey = '';

        for (const [candKey] of candidateNormMap) {
          if (usedCandidateKeys.has(candKey)) continue;

          const similarity = jaroWinkler(reqNorm, candKey, { ignoreCase: true });
          if (similarity >= threshold && similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestCandidateKey = candKey;
          }
        }

        if (bestCandidateKey) {
          usedCandidateKeys.add(bestCandidateKey);
          matchedSkills.push(reqSkill);
          const candOrig = candidateNormMap.get(bestCandidateKey)!;
          const roundedSim = Math.round(bestSimilarity * 1000) / 1000;
          
          fuzzyMatchedSkills.push({
            candidate: candOrig,
            required: reqSkill,
            similarity: roundedSim,
          });
          fuzzyMatches.push({
            candidateSkill: candOrig,
            requiredSkill: reqSkill,
            score: roundedSim,
          });
          matched = true;
        }
      }

      if (!matched) {
        missingSkills.push(reqSkill);
      }
    }

    const matchPercentage =
      uniqueRequired.length > 0
        ? Math.max(0, Math.min(100, Math.round((matchedSkills.length / uniqueRequired.length) * 100)))
        : 0;

    if (fuzzyMatchedSkills.length > 0) {
      console.log(
        `${LOG_PREFIX} Fuzzy matches: ${fuzzyMatchedSkills.map((f) => `${f.candidate}↔${f.required}(${f.similarity})`).join(', ')}`,
      );
    }

    return {
      matchPercentage,
      matchScore: matchPercentage,
      matchedSkills,
      missingSkills,
      fuzzyMatchedSkills,
      fuzzyMatches,
    };
  },

  /**
   * Normalize a skill string to its canonical form.
   * Delegates to skillTaxonomy + lowercase normalization.
   * Exported for use in tests and external utilities.
   */
  normalizeSkill(skill: string): string {
    return normalize(skill);
  },
};
