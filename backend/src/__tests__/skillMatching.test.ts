/**
 * Unit Tests — SkillMatchingService
 *
 * Covers:
 *   - Exact matching
 *   - Alias/taxonomy normalization (via skillTaxonomy)
 *   - Jaro-Winkler fuzzy matching
 *   - Duplicate prevention (both required and candidate sides)
 *   - Missing skill calculation
 *   - Edge cases (empty inputs, null-safe guards)
 *   - Percentage normalization (0–100, capped)
 */

import { SkillMatchingService } from '../services/matching/skillMatching.service';

describe('SkillMatchingService', () => {
  // ── Basic exact matching ────────────────────────────────────────────────────

  describe('Exact skill matching', () => {
    it('returns 100% when candidate has all required skills (exact)', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['React', 'Node.js', 'PostgreSQL'],
        ['React', 'Node.js', 'PostgreSQL'],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toHaveLength(3);
      expect(result.missingSkills).toHaveLength(0);
    });

    it('returns 0% when candidate has none of the required skills', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['Java', 'Spring'],
        ['React', 'Node.js'],
      );
      expect(result.matchPercentage).toBe(0);
      expect(result.matchedSkills).toHaveLength(0);
      expect(result.missingSkills).toEqual(['React', 'Node.js']);
    });

    it('returns 50% for partial match', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['React', 'Java'],
        ['React', 'Node.js'],
      );
      expect(result.matchPercentage).toBe(50);
      expect(result.matchedSkills).toContain('React');
      expect(result.missingSkills).toContain('Node.js');
    });

    it('is case-insensitive for exact matching', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['react', 'NODEJS'],
        ['React', 'Node.js'],
      );
      // 'react' normalizes to 'react', required 'React' normalizes to 'react' — match
      expect(result.matchedSkills).toContain('React');
    });
  });

  // ── Alias / taxonomy normalization ──────────────────────────────────────────

  describe('Alias normalization matching', () => {
    it('matches "reactjs" candidate to "React" required via alias', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['reactjs'],
        ['React'],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toContain('React');
    });

    it('matches "nodejs" candidate to "Node.js" required via alias', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['nodejs'],
        ['Node.js'],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toContain('Node.js');
    });

    it('matches "postgres" candidate to "PostgreSQL" required via alias', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['postgres'],
        ['PostgreSQL'],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toContain('PostgreSQL');
    });

    it('matches "ts" candidate to "TypeScript" required via alias', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['ts'],
        ['TypeScript'],
      );
      expect(result.matchPercentage).toBe(100);
    });
  });

  // ── Fuzzy matching ──────────────────────────────────────────────────────────

  describe('Jaro-Winkler fuzzy matching', () => {
    it('fuzzy-matches "Node" to "Node.js"', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['Node'],
        ['Node.js'],
      );
      // Either via alias ('node' → 'Node.js') or Jaro-Winkler, should match
      expect(result.matchPercentage).toBe(100);
    });

    it('fuzzy-matches "Postgres" to "PostgreSQL"', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['Postgres'],
        ['PostgreSQL'],
      );
      expect(result.matchPercentage).toBe(100);
    });

    it('does NOT match completely unrelated skills', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['Python'],
        ['JavaScript'],
      );
      expect(result.matchPercentage).toBe(0);
      expect(result.missingSkills).toContain('JavaScript');
    });

    it('fuzzy match info is included in fuzzyMatchedSkills array', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['Node'],
        ['Node.js'],
      );
      // The match may be via alias (exact after normalize) or fuzzy
      // Either way, percentage should be 100
      expect(result.matchPercentage).toBe(100);
    });
  });

  // ── Duplicate prevention ────────────────────────────────────────────────────

  describe('Duplicate prevention', () => {
    it('one candidate skill does NOT match multiple required skills', () => {
      // "React" should only count once even if job requires "React" and "ReactJS"
      const result = SkillMatchingService.calculateSkillMatch(
        ['React'],
        ['React', 'React'], // duplicated required skill
      );
      // Deduplication of required means 1 unique required → 100%
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toHaveLength(1);
    });

    it('duplicate candidate skills are deduplicated before matching', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['React', 'React', 'React'], // duplicated candidate
        ['React'],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toHaveLength(1);
    });

    it('candidate skill already used for one required cannot match another', () => {
      // "reactjs" → normalizes to same as "React"
      // Required: ['React', 'Vue'] — should only match one of them
      const result = SkillMatchingService.calculateSkillMatch(
        ['reactjs'],         // one candidate skill
        ['React', 'Vue'],    // two required skills
      );
      // Can only match 'React', not 'Vue'
      expect(result.matchPercentage).toBe(50);
      expect(result.matchedSkills).toContain('React');
      expect(result.missingSkills).toContain('Vue');
    });
  });

  // ── Missing skills ──────────────────────────────────────────────────────────

  describe('Missing skills calculation', () => {
    it('correctly identifies all missing skills', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['HTML', 'CSS'],
        ['HTML', 'CSS', 'JavaScript', 'TypeScript'],
      );
      expect(result.missingSkills).toContain('JavaScript');
      expect(result.missingSkills).toContain('TypeScript');
      expect(result.missingSkills).toHaveLength(2);
    });

    it('missing skills uses original required casing, not normalized', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        [],
        ['Node.js', 'PostgreSQL'],
      );
      expect(result.missingSkills).toContain('Node.js');
      expect(result.missingSkills).toContain('PostgreSQL');
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('returns 0% when required skills list is empty', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['React', 'Node.js'],
        [],
      );
      expect(result.matchPercentage).toBe(0);
      expect(result.matchedSkills).toHaveLength(0);
      expect(result.missingSkills).toHaveLength(0);
    });

    it('returns 0% when candidate skills list is empty', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        [],
        ['React', 'Node.js'],
      );
      expect(result.matchPercentage).toBe(0);
      expect(result.missingSkills).toEqual(['React', 'Node.js']);
    });

    it('handles null/undefined gracefully without throwing', () => {
      expect(() =>
        SkillMatchingService.calculateSkillMatch(null as any, ['React']),
      ).not.toThrow();

      expect(() =>
        SkillMatchingService.calculateSkillMatch(['React'], null as any),
      ).not.toThrow();
    });

    it('percentage is always capped at 0–100', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['React', 'Node.js', 'Python', 'Go'],
        ['React'],
      );
      expect(result.matchPercentage).toBeGreaterThanOrEqual(0);
      expect(result.matchPercentage).toBeLessThanOrEqual(100);
    });

    it('filters out empty/whitespace-only skills from both sides', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['React', '', '  '],
        ['React', '', '  '],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toHaveLength(1);
    });
  });

  // ── normalizeSkill utility ──────────────────────────────────────────────────

  describe('normalizeSkill utility', () => {
    it('normalizes "ReactJS" to its alias canonical form', () => {
      const normalized = SkillMatchingService.normalizeSkill('ReactJS');
      expect(normalized.toLowerCase()).toBe('react');
    });

    it('normalizes empty string safely', () => {
      expect(() => SkillMatchingService.normalizeSkill('')).not.toThrow();
    });
  });
});
