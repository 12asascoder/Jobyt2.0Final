/**
 * Skill Matching Service
 *
 * Provides deterministic skill-level matching between candidate skills and job requirements.
 * Uses exact match, substring containment, and fuzzy (JaroWinkler) matching.
 *
 * This is intentionally a thin adapter over the core ATS scoring logic,
 * providing a richer return shape (fuzzyMatches detail) for explainability.
 */

const FUZZY_THRESHOLD = 0.85;

export interface FuzzyMatchDetail {
  candidateSkill: string;
  requiredSkill: string;
  score: number;
}

export interface SkillMatchResult {
  matchedSkills: string[];
  missingSkills: string[];
  matchScore: number; // 0-100
  fuzzyMatches: FuzzyMatchDetail[];
}

function jaroWinkler(s1: string, s2: string): number {
  // Fallback to substring check when natural is unavailable
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const natural = require('natural') as typeof import('natural');
    return natural.JaroWinklerDistance(s1, s2, { ignoreCase: true });
  } catch {
    return s1 === s2 ? 1 : s1.includes(s2) || s2.includes(s1) ? 0.9 : 0;
  }
}

export const SkillMatchingService = {
  /**
   * Calculate skill overlap between candidate skills and required job skills.
   *
   * @param candidateSkills  Skills listed on the candidate's resume / profile
   * @param requiredSkills   Skills required by the job
   * @returns SkillMatchResult with matched, missing, score, and fuzzy detail
   */
  calculateSkillMatch(
    candidateSkills: string[],
    requiredSkills: string[],
  ): SkillMatchResult {
    if (requiredSkills.length === 0) {
      return {
        matchedSkills: [],
        missingSkills: [],
        matchScore: candidateSkills.length > 0 ? 100 : 0,
        fuzzyMatches: [],
      };
    }

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    const fuzzyMatches: FuzzyMatchDetail[] = [];

    for (const req of requiredSkills) {
      const normReq = req.toLowerCase().trim();
      let matched = false;
      let bestScore = 0;
      let bestCandidate = '';

      for (const cand of candidateSkills) {
        const normCand = cand.toLowerCase().trim();

        // Exact match
        if (normReq === normCand) {
          matched = true;
          bestScore = 1;
          bestCandidate = cand;
          break;
        }

        // Substring containment
        if (normCand.includes(normReq) || normReq.includes(normCand)) {
          matched = true;
          bestScore = 0.95;
          bestCandidate = cand;
          break;
        }

        // Fuzzy JaroWinkler
        const score = jaroWinkler(normReq, normCand);
        if (score >= FUZZY_THRESHOLD && score > bestScore) {
          bestScore = score;
          bestCandidate = cand;
        }
      }

      if (matched || (bestScore >= FUZZY_THRESHOLD && bestCandidate)) {
        matchedSkills.push(req);
        if (bestScore < 1 && bestCandidate) {
          fuzzyMatches.push({ candidateSkill: bestCandidate, requiredSkill: req, score: bestScore });
        }
      } else {
        missingSkills.push(req);
      }
    }

    const matchScore = Math.round((matchedSkills.length / requiredSkills.length) * 100);

    return { matchedSkills, missingSkills, matchScore, fuzzyMatches };
  },
};
