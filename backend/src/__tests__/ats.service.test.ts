import { ATSService } from '../services/ats.service';

describe('ATS Scoring Service', () => {
  describe('Skills Match (50% weight)', () => {
    it('should score 100% when all job skills are present', () => {
      const result = ATSService.calculateATSScore(
        { skills: ['react', 'node.js', 'typescript'], experienceText: '', fullText: '' },
        { skills: ['React', 'TypeScript', 'Node.js'], description: '' }
      );
      expect(result.sectionScores.skillsScore).toBe(100);
      expect(result.matchedSkills.length).toBe(3);
    });

    it('should score 50% when half of job skills are present', () => {
      const result = ATSService.calculateATSScore(
        { skills: ['React'], experienceText: '', fullText: '' },
        { skills: ['React', 'TypeScript'], description: '' }
      );
      expect(result.sectionScores.skillsScore).toBe(50);
      expect(result.matchedSkills).toContain('React');
      expect(result.missingSkills).toContain('TypeScript');
    });

    it('should handle substring matches', () => {
      const result = ATSService.calculateATSScore(
        { skills: ['ReactJS'], experienceText: '', fullText: '' },
        { skills: ['React'], description: '' }
      );
      expect(result.sectionScores.skillsScore).toBe(100);
    });
  });

  describe('Experience Match (30% weight)', () => {
    it('should compute overlap between experience text and job description', () => {
      const result = ATSService.calculateATSScore(
        { skills: [], experienceText: 'Led a team building a scalable backend with microservices', fullText: '' },
        { skills: [], description: 'Looking for someone to build a scalable backend with microservices' }
      );
      expect(result.sectionScores.experienceScore).toBeGreaterThan(0);
      expect(result.debug.experienceTokenOverlap).toBeGreaterThan(0);
    });
  });

  describe('Keywords Match (20% weight)', () => {
    it('should extract meaningful keyword overlaps', () => {
      const result = ATSService.calculateATSScore(
        { skills: [], experienceText: '', fullText: 'Proficient in Kubernetes, Docker, and AWS deployments' },
        { skills: [], description: 'Requires experience with Kubernetes and Docker' }
      );
      expect(result.sectionScores.keywordsScore).toBeGreaterThan(0);
      expect(result.keywordOverlap).toContain('kubernetes');
      expect(result.keywordOverlap).toContain('docker');
    });
  });

  describe('Total Score', () => {
    it('should calculate weighted total score correctly', () => {
      const result = ATSService.calculateATSScore(
        { 
          skills: ['python', 'django'], 
          experienceText: 'Built REST APIs with Python and Django', 
          fullText: 'Built REST APIs with Python and Django' 
        },
        { 
          skills: ['python', 'django', 'aws'], 
          description: 'Build REST APIs with Python, Django, and deploy to AWS' 
        }
      );
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(result.sectionScores.skillsScore).toBe(67);
    });
  });
});
