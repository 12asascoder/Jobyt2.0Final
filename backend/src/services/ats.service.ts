/**
 * ATS (Applicant Tracking System) Scoring Service
 *
 * Deterministic, weighted scoring engine for resume-to-job matching.
 * Same input → guaranteed same output. No randomness, no LLM dependency.
 *
 * Scoring weights:
 *   - Skills match:      50%
 *   - Experience match:  30%
 *   - Keywords match:    20%
 */

const LOG_PREFIX = '[ATS]';

export interface ATSSectionScores {
  skillsScore: number;       // 0–100
  experienceScore: number;   // 0–100
  keywordsScore: number;     // 0–100
}

export interface ATSScoreResult {
  totalScore: number;        // 0–100 weighted composite
  sectionScores: ATSSectionScores;
  matchedSkills: string[];
  missingSkills: string[];
  keywordOverlap: string[];
  debug: {
    resumeSkillCount: number;
    jobSkillCount: number;
    experienceTokenOverlap: number;
    keywordTokenOverlap: number;
    weights: { skills: number; experience: number; keywords: number };
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
function scoreSkills(
  resumeSkills: string[],
  jobSkills: string[],
): { score: number; matched: string[]; missing: string[] } {
  if (!jobSkills.length) {
    return { score: 0, matched: [], missing: [] };
  }

  const matched: string[] = [];
  const missing: string[] = [];

  // Use JaroWinkler for fuzzy matching (deterministic)
  let natural: typeof import('natural') | null = null;
  try {
    natural = require('natural');
  } catch {
    // Fallback to exact match if natural is unavailable
  }

  for (const jSkill of jobSkills) {
    let isMatch = false;
    const normJ = jSkill.toLowerCase().trim();

    for (const uSkill of resumeSkills) {
      const normU = uSkill.toLowerCase().trim();

      // Exact match
      if (normJ === normU) {
        isMatch = true;
        break;
      }

      // Substring containment (e.g., "Node.js" in "Node.js development")
      if (normU.includes(normJ) || normJ.includes(normU)) {
        isMatch = true;
        break;
      }

      // Fuzzy match (JaroWinkler ≥ 0.85)
      if (natural) {
        const distance = natural.JaroWinklerDistance(normJ, normU, { ignoreCase: true });
        if (distance >= 0.85) {
          isMatch = true;
          break;
        }
      }
    }

    if (isMatch) {
      matched.push(jSkill);
    } else {
      missing.push(jSkill);
    }
  }

  const score = Math.round((matched.length / jobSkills.length) * 100);
  return { score, matched, missing };
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
  WEIGHTS: { skills: 0.5, experience: 0.3, keywords: 0.2 } as const,

  /**
   * Calculate deterministic ATS score.
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

    // Weighted composite
    const totalScore = Math.round(
      skillsResult.score * this.WEIGHTS.skills +
      experienceResult.score * this.WEIGHTS.experience +
      keywordsResult.score * this.WEIGHTS.keywords,
    );

    const result: ATSScoreResult = {
      totalScore: Math.max(0, Math.min(100, totalScore)),
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
};
