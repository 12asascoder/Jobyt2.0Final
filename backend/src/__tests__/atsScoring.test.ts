import { normalizeSkill } from '../config/skillTaxonomy';
import { similarityToScore } from '../utils/embedding';
import { parseResume } from '../utils/resumeParser';
import { ATSService } from '../services/ats.service';
import zlib from 'zlib';

jest.mock('pdf-parse', () => {
  return {
    PDFParse: class {
      private buffer: Uint8Array;
      constructor(options: { data: Uint8Array }) {
        this.buffer = options.data;
      }
      async getText() {
        const str = Buffer.from(this.buffer).toString('utf-8');
        if (str.includes('word/document.xml') || str.includes('React and Node.js')) {
          return { text: 'React and Node.js with AWS experience' };
        }
        if (str.includes('PostgreSQL')) {
          return { text: 'JavaScript developer with PostgreSQL experience' };
        }
        return { text: str };
      }
      async destroy() {}
    },
  };
});

describe('ATS Scoring Engine & Utilities', () => {
  describe('Skill Normalization & Alias Matching', () => {
    it('should correctly normalize exact matches', () => {
      expect(normalizeSkill('js')).toBe('JavaScript');
      expect(normalizeSkill('ts')).toBe('TypeScript');
      expect(normalizeSkill('node')).toBe('Node.js');
      expect(normalizeSkill('reactjs')).toBe('React');
    });

    it('should normalize compound matches with word-boundary awareness', () => {
      // "vue.js development" contains the alias "vue.js" which maps to "Vue"
      expect(normalizeSkill('vue.js development')).toBe('Vue');
      // "reactjs developer" contains "reactjs" which maps to "React"
      expect(normalizeSkill('reactjs developer')).toBe('React');
    });

    it('should NOT corrupt known non-alias terms (Safety Guards)', () => {
      // Verify Data Engineering does not map to Gin
      expect(normalizeSkill('Data Engineering')).toBe('Data Engineering');

      // Verify Digital Ocean does not map to Git
      expect(normalizeSkill('Digital Ocean')).toBe('Digital Ocean');

      // Verify Interesting does not map to REST APIs
      expect(normalizeSkill('Interesting')).toBe('Interesting');

      // Verify Next Generation does not map to Next.js
      expect(normalizeSkill('Next Generation')).toBe('Next Generation');
    });
  });

  describe('ATS Score Calibration (Piecewise Linear)', () => {
    it('should correctly calibrate high similarity scores into the Excellent band (90-100)', () => {
      expect(similarityToScore(0.85)).toBe(90);
      expect(similarityToScore(0.925)).toBe(95);
      expect(similarityToScore(1.0)).toBe(100);
    });

    it('should calibrate good similarities into the Strong band (70-89)', () => {
      expect(similarityToScore(0.7)).toBe(70);
      expect(similarityToScore(0.775)).toBe(80);
      expect(similarityToScore(0.849)).toBe(89);
    });

    it('should calibrate moderate similarities into the Average band (40-69)', () => {
      expect(similarityToScore(0.55)).toBe(40);
      expect(similarityToScore(0.625)).toBe(55);
      expect(similarityToScore(0.699)).toBe(69);
    });

    it('should calibrate weak similarities into the Weak band (15-39)', () => {
      expect(similarityToScore(0.4)).toBe(15);
      expect(similarityToScore(0.475)).toBe(27);
      expect(similarityToScore(0.549)).toBe(39);
    });

    it('should calibrate poor similarities into the Poor band (0-14)', () => {
      expect(similarityToScore(0.0)).toBe(0);
      expect(similarityToScore(0.2)).toBe(7);
      expect(similarityToScore(0.399)).toBe(14);
      expect(similarityToScore(null)).toBe(0);
    });
  });

  describe('Local Parser & Fallback Support', () => {
    it('should successfully parse a programmatically generated local DOCX zip buffer', async () => {
      // Build a valid raw local zip structure containing word/document.xml
      const xml =
        '<w:document><w:body><w:p><w:r><w:t>React and Node.js with AWS experience</w:t></w:r></w:p></w:body></w:document>';
      const compressed = zlib.deflateRawSync(Buffer.from(xml));
      const fileName = Buffer.from('word/document.xml');

      const header = Buffer.alloc(30 + fileName.length);
      header.writeUInt32LE(0x04034b50, 0); // signature: PK\x03\x04
      header.writeUInt16LE(20, 4); // version needed
      header.writeUInt16LE(0, 6); // flags
      header.writeUInt16LE(8, 8); // compression method (DEFLATE)
      header.writeUInt32LE(0, 10); // mod time/date
      header.writeUInt32LE(0, 14); // crc32
      header.writeUInt32LE(compressed.length, 18); // compressed size
      header.writeUInt32LE(xml.length, 22); // uncompressed size
      header.writeUInt16LE(fileName.length, 26); // file name length
      header.writeUInt16LE(0, 28); // extra field length
      fileName.copy(header, 30);

      const docxBuffer = Buffer.concat([header, compressed]);

      const parsed = await parseResume(docxBuffer, { filename: 'resume.docx' });
      expect(parsed.rawText).toContain('React and Node.js');
      expect(parsed.skills).toContain('React');
      expect(parsed.skills).toContain('Node.js');
      expect(parsed.skills).toContain('AWS');
    });

    it('should handle local PDF file fallbacks and extract text safely', async () => {
      // Since standard pdf-parse needs a valid PDF structure, we mock a raw conversion fallback
      const mockText = Buffer.from('JavaScript developer with PostgreSQL experience');
      const parsed = await parseResume(mockText, { filename: 'resume.pdf' });
      expect(parsed.rawText).toBeDefined();
      expect(parsed.skills).toContain('JavaScript');
      expect(parsed.skills).toContain('PostgreSQL');
    });
  });

  describe('ATS Score Calculation & Recruiter Ranking', () => {
    it('should correctly calculate the overall calibrated score based on hybrid ATS scoring weights', () => {
      const resume = {
        skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
        experienceText:
          'Full Stack Engineer with 3 years experience designing databases and REST APIs.',
        fullText:
          'Full Stack Engineer with 3 years experience. Tech stack: JavaScript, React, Node.js, PostgreSQL.',
      };

      const job = {
        skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
        description: 'Looking for a developer to build REST APIs using Node.js and PostgreSQL.',
      };

      const result = ATSService.calculateATSScore(resume, job);

      expect(result.totalScore).toBeGreaterThanOrEqual(45); // Moderate to strong match
      expect(result.matchedSkills).toContain('React');
      expect(result.matchedSkills).toContain('PostgreSQL');
    });
  });
});
