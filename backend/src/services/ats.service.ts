/**
 * ATS (Applicant Tracking System) Scoring Service
 *
 * Deterministic, weighted scoring engine for resume-to-job matching.
 * Same input → guaranteed same output. No randomness, no LLM dependency.
 *
 * Keyword-only weights (used when embeddings are unavailable):
 *   - Skills match:      50%
 *   - Experience match:  30%
 *   - Keywords match:    20%
 *
 * Embedding-enhanced weights (primary runtime path):
 *   - Embedding similarity: 45%  ← real semantic signal
 *   - Skills match:         30%
 *   - Experience match:     15%
 *   - Keywords match:       10%  ← light tie-breaker
 */

import { EmbeddingCacheService } from './embeddingCache.service';
import { cosineSimilarity, similarityToScore } from '../utils/embedding';
import { SkillMatchingService } from './matching/skillMatching.service';

const LOG_PREFIX = '[ATS]';

export interface ATSSectionScores {
  skillsScore: number;       // 0–100
  experienceScore: number;   // 0–100
  keywordsScore: number;     // 0–100
}

export interface ATSScoreResult {
  totalScore: number;              // 0–100 weighted composite
  semanticSimilarityScore: number; // 0–100 embedding cosine similarity (0 when unavailable)
  sectionScores: ATSSectionScores;
  matchedSkills: string[];
  missingSkills: string[];
  keywordOverlap: string[];
  debug: {
    resumeSkillCount: number;
    jobSkillCount: number;
    experienceTokenOverlap: number;
    keywordTokenOverlap: number;
    embeddingAvailable: boolean;
    weights: { skills: number; experience: number; keywords: number; embedding?: number };
  };
}

// ── Utility: normalise tokens ────────────────────────────────────────────────
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9#+.\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

function uniqueTokens(text: string): Set<string> {
  return new Set(tokenize(text));
}

// ── Skills matching (50% weight) ─────────────────────────────────────────────
// Delegates to the unified SkillMatchingService — single source of truth.
function scoreSkills(
  resumeSkills: string[],
  jobSkills: string[],
): { score: number; matched: string[]; missing: string[] } {
  if (!jobSkills.length) {
    return { score: 0, matched: [], missing: [] };
  }

  const result = SkillMatchingService.calculateSkillMatch(resumeSkills, jobSkills);
  return {
    score: result.matchPercentage,
    matched: result.matchedSkills,
    missing: result.missingSkills,
  };
}

// ── Experience matching (30% weight) ─────────────────────────────────────────
function scoreExperience(
  resumeExperience: string,
  jobDescription: string,
): { score: number; overlapCount: number } {
  if (!resumeExperience.trim() || !jobDescription.trim()) {
    return { score: 0, overlapCount: 0 };
  }

  const resumeTokens = uniqueTokens(resumeExperience);
  const jobTokens = uniqueTokens(jobDescription);

  // Filter out very common words (simple stopword removal)
  const stopwords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
    'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been',
    'will', 'with', 'that', 'this', 'from', 'they', 'would', 'make',
    'like', 'just', 'over', 'such', 'take', 'than', 'them', 'very',
    'some', 'could', 'what', 'there', 'their', 'about', 'which',
    'when', 'were', 'into', 'more', 'other', 'your', 'able', 'work',
    'team', 'role', 'years', 'year', 'experience', 'working',
  ]);

  const filteredResume = new Set([...resumeTokens].filter(t => !stopwords.has(t)));
  const filteredJob = new Set([...jobTokens].filter(t => !stopwords.has(t)));

  if (filteredJob.size === 0) {
    return { score: 0, overlapCount: 0 };
  }

  let overlapCount = 0;
  for (const token of filteredJob) {
    if (filteredResume.has(token)) {
      overlapCount++;
    }
  }

  // Jaccard-like overlap ratio, capped at 100
  const ratio = overlapCount / filteredJob.size;
  const score = Math.min(100, Math.round(ratio * 100));

  return { score, overlapCount };
}

// ── Keywords matching (20% weight) ───────────────────────────────────────────
function scoreKeywords(
  resumeText: string,
  jobDescription: string,
): { score: number; overlapping: string[]; overlapCount: number } {
  if (!resumeText.trim() || !jobDescription.trim()) {
    return { score: 0, overlapping: [], overlapCount: 0 };
  }

  const resumeTokens = uniqueTokens(resumeText);
  const jobTokens = uniqueTokens(jobDescription);

  // Find overlapping meaningful tokens (length > 3 to skip noise)
  const overlapping: string[] = [];
  for (const token of jobTokens) {
    if (token.length > 3 && resumeTokens.has(token)) {
      overlapping.push(token);
    }
  }

  const meaningfulJobTokens = [...jobTokens].filter(t => t.length > 3);
  if (meaningfulJobTokens.length === 0) {
    return { score: 0, overlapping: [], overlapCount: 0 };
  }

  const ratio = overlapping.length / meaningfulJobTokens.length;
  const score = Math.min(100, Math.round(ratio * 100));

  return { score, overlapping, overlapCount: overlapping.length };
}

// ── Main scoring function ────────────────────────────────────────────────────
export const ATSService = {
  /** Keyword-only weights — used as fallback when embeddings are unavailable. */
  WEIGHTS: { skills: 0.5, experience: 0.3, keywords: 0.2 } as const,

  /** Embedding-enhanced weights — primary runtime path. */
  EMBEDDING_WEIGHTS: { embedding: 0.45, skills: 0.30, experience: 0.15, keywords: 0.10 } as const,

  /**
   * Calculate deterministic, keyword-only ATS score.
   *
   * This method is SYNCHRONOUS and PURE — identical inputs always produce
   * identical outputs. It is safe to use in tests and as a fallback.
   *
   * @param resumeData - Parsed resume data
   * @param jobData - Job requirements
   * @returns ATSScoreResult with full breakdown + debug info
   */
  calculateATSScore(
    resumeData: {
      skills: string[];
      experienceText: string;
      fullText: string;
    },
    jobData: {
      skills: string[];
      description: string;
    },
  ): ATSScoreResult {
    const startMs = Date.now();

    // 1) Skills score (50%)
    const skillsResult = scoreSkills(resumeData.skills, jobData.skills);

    // 2) Experience score (30%)
    const experienceResult = scoreExperience(
      resumeData.experienceText,
      jobData.description,
    );

    // 3) Keywords score (20%)
    const keywordsResult = scoreKeywords(
      resumeData.fullText,
      jobData.description,
    );

    // Keyword-only weighted composite
    const totalScore = Math.round(
      skillsResult.score * this.WEIGHTS.skills +
      experienceResult.score * this.WEIGHTS.experience +
      keywordsResult.score * this.WEIGHTS.keywords,
    );

    const result: ATSScoreResult = {
      totalScore: Math.max(0, Math.min(100, totalScore)),
      semanticSimilarityScore: 0, // populated by calculateATSScoreWithEmbedding()
      sectionScores: {
        skillsScore: skillsResult.score,
        experienceScore: experienceResult.score,
        keywordsScore: keywordsResult.score,
      },
      matchedSkills: skillsResult.matched,
      missingSkills: skillsResult.missing,
      keywordOverlap: keywordsResult.overlapping,
      debug: {
        resumeSkillCount: resumeData.skills.length,
        jobSkillCount: jobData.skills.length,
        experienceTokenOverlap: experienceResult.overlapCount,
        keywordTokenOverlap: keywordsResult.overlapCount,
        embeddingAvailable: false,
        weights: this.WEIGHTS,
      },
    };

    const elapsed = Date.now() - startMs;
    console.log(
      `${LOG_PREFIX} Score: ${result.totalScore}/100 ` +
      `[skills=${skillsResult.score} exp=${experienceResult.score} kw=${keywordsResult.score}] ` +
      `matched=${skillsResult.matched.length}/${jobData.skills.length} skills, ` +
      `${elapsed}ms`,
    );

    return result;
  },

  /**
   * Calculate ATS score with real embedding-based semantic similarity.
   *
   * This is the PRIMARY runtime path for production ATS scoring.
   *
   * Execution order:
   *   1. Run synchronous keyword/skills scoring (always fast, always works)
   *   2. Fetch resume + job embeddings via cache (0 Gemini calls on cache hit)
   *   3. Compute cosine similarity → normalise to 0–100
   *   4. Blend embedding score into total using EMBEDDING_WEIGHTS
   *   5. If any embedding step fails → return keyword-only result (no crash)
   *
   * Cache strategy:
   *   - Identical texts NEVER re-generate embeddings (SHA-256 keyed)
   *   - Job embeddings are also looked up from jobs.description_embedding (fast-path)
   *   - Resume embeddings are keyed by resume:${resumeId} if resumeId is provided
   *
   * @param resumeData - Parsed resume data (same shape as calculateATSScore)
   * @param jobData - Job requirements (same shape as calculateATSScore)
   * @param jobId - Optional: job UUID for fast-path job embedding lookup
   * @param resumeId - Optional: resume UUID for keyed resume embedding lookup
   * @param applicantId - Required when resumeId provided
   */
  async calculateATSScoreWithEmbedding(
    resumeData: {
      skills: string[];
      experienceText: string;
      fullText: string;
    },
    jobData: {
      skills: string[];
      description: string;
    },
    options?: {
      jobId?: string;
      resumeId?: string;
      applicantId?: string;
    },
  ): Promise<ATSScoreResult> {
    const startMs = Date.now();

    // Step 1: keyword/skills baseline (synchronous, always succeeds)
    const baseResult = this.calculateATSScore(resumeData, jobData);

    // Step 2: attempt embedding-enhanced scoring
    try {
      // --- Fetch resume embedding (cache-first) ---
      let resumeEmbedding = null;
      if (options?.resumeId && options?.applicantId) {
        // Keyed by resume ID — reuses existing vector across multiple job comparisons
        resumeEmbedding = await EmbeddingCacheService.getResumeEmbedding(
          options.resumeId,
          options.applicantId,
        );
      }
      if (!resumeEmbedding) {
        // Fallback: hash-keyed lookup on full resume text
        resumeEmbedding = await EmbeddingCacheService.getOrGenerate(resumeData.fullText);
      }

      if (!resumeEmbedding) {
        // Embeddings unavailable (Gemini not configured / circuit open / quota)
        console.log(`${LOG_PREFIX} Embedding unavailable for resume — using keyword fallback`);
        return baseResult;
      }

      // --- Fetch job embedding (cache-first, fast-path via jobs table) ---
      let jobEmbedding = null;
      if (options?.jobId) {
        // Fastest path: stored directly in jobs.description_embedding
        jobEmbedding = await EmbeddingCacheService.getJobEmbedding(options.jobId);
      }
      if (!jobEmbedding) {
        // Second path: text-hash cache lookup or generate
        jobEmbedding = await EmbeddingCacheService.getOrGenerate(jobData.description);
      }
      if (!jobEmbedding && options?.jobId) {
        // Store newly generated embedding for future calls (fire-and-forget)
        if (jobEmbedding) {
          EmbeddingCacheService.storeJobEmbedding(options.jobId, jobEmbedding).catch(
            (err) => console.warn(`${LOG_PREFIX} Failed to cache job embedding:`, err),
          );
        }
      }

      if (!jobEmbedding) {
        console.log(`${LOG_PREFIX} Embedding unavailable for job — using keyword fallback`);
        return baseResult;
      }

      // Step 3: cosine similarity → normalised score
      const similarity = cosineSimilarity(resumeEmbedding, jobEmbedding);
      const embeddingScore = similarityToScore(similarity); // 0–100

      // Step 4: blend embedding signal with keyword scores
      const W = this.EMBEDDING_WEIGHTS;
      const blendedTotal = Math.round(
        embeddingScore               * W.embedding +
        baseResult.sectionScores.skillsScore    * W.skills +
        baseResult.sectionScores.experienceScore * W.experience +
        baseResult.sectionScores.keywordsScore  * W.keywords,
      );

      const elapsed = Date.now() - startMs;
      console.log(
        `${LOG_PREFIX} Embedding-enhanced score: ${blendedTotal}/100 ` +
        `[embed=${embeddingScore} skills=${baseResult.sectionScores.skillsScore} ` +
        `exp=${baseResult.sectionScores.experienceScore} kw=${baseResult.sectionScores.keywordsScore}] ` +
        `${elapsed}ms`,
      );

      return {
        ...baseResult,
        totalScore: Math.max(0, Math.min(100, blendedTotal)),
        semanticSimilarityScore: embeddingScore,
        debug: {
          ...baseResult.debug,
          embeddingAvailable: true,
          weights: W,
        },
      };
    } catch (err) {
      // Safety net: embedding pipeline failure MUST NOT crash ATS
      console.warn(
        `${LOG_PREFIX} Embedding scoring failed — degrading to keyword fallback:`,
        err instanceof Error ? err.message : String(err),
      );
      return baseResult;
    }
  },
};
