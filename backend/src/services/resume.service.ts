import { ResumeDeleteResult, ResumeListItem, ResumeModel } from '../models/resume.model';
import { ApplicantProfileModel } from '../models/applicantProfile.model';
import { StorageService } from './storage.service';
import { withTransaction } from '../utils/transaction';
import fs from 'fs/promises';
import path from 'path';
import { parseResume } from '../utils/resumeParser';
import pool from '../config/database';

export interface ATSResult {
  score: number;
  missingKeywords: string[];
  semanticSimilarityScore: number;
  sectionScores: {
    skillsScore: number;
    experienceScore: number;
    keywordsScore: number;
  };
  keywordDensity: Record<string, number>;
  explanation: string;
  feedback: {
    missingSections: string[];
    weakAreas: string[];
    improvements: string[];
  };
  qualityScore: number;
  rolePrediction: string;
  experience: string;
}

export const ResumeService = {
  audit(event: string, payload: Record<string, unknown>) {
    console.info('[AUDIT]', event, payload);
  },

  async getUserResumes(userId: string): Promise<ResumeListItem[]> {
    return ResumeModel.findByUserId(userId);
  },

  async getDefaultResume(userId: string): Promise<ResumeListItem> {
    const resume = await ResumeModel.findDefaultByUserId(userId);
    if (!resume) {
      throw Object.assign(new Error('No default resume found'), {
        statusCode: 404,
        code: 'DEFAULT_RESUME_NOT_FOUND',
      });
    }

    const { user_id: _omitUserId, updated_at: _omitUpdatedAt, ...rest } = resume;
    return rest;
  },

  async getUserResumeById(userId: string, resumeId: string) {
    const [resume, profile] = await Promise.all([
      ResumeModel.findByUserAndId(userId, resumeId),
      ApplicantProfileModel.findByUserId(userId),
    ]);

    if (!resume) {
      throw Object.assign(new Error('Resume not found'), {
        statusCode: 404,
        code: 'RESUME_NOT_FOUND',
      });
    }

    let parsedFromFile: {
      name: string | null;
      skills: string[];
      experience: unknown[];
      education: unknown[];
    } = {
      name: null,
      skills: [],
      experience: [],
      education: [],
    };

    try {
      const buffer = await ResumeService.loadResumeFileBuffer(resume.file_url);
      const parsed = await parseResume(buffer, {
        filename: resume.file_name,
        mimeType: resume.mime_type || undefined,
      });

      parsedFromFile = {
        name: parsed.name,
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        education: Array.isArray(parsed.education) ? parsed.education : [],
      };
    } catch (err) {
      console.warn('Failed to parse resume file for detail view, falling back to profile data:', err);
    }

    const fallbackExperience = Array.isArray(profile?.experience) ? profile.experience : [];
    const fallbackEducation = Array.isArray(profile?.education) ? profile.education : [];
    const fallbackSkills = Array.isArray(profile?.skills) ? profile.skills : [];
    const fallbackName = profile?.name ?? null;

    return {
      ...resume,
      parsed: {
        name: parsedFromFile.name ?? fallbackName,
        skills: parsedFromFile.skills.length > 0 ? parsedFromFile.skills : fallbackSkills,
        experience: parsedFromFile.experience.length > 0 ? parsedFromFile.experience : fallbackExperience,
        education: parsedFromFile.education.length > 0 ? parsedFromFile.education : fallbackEducation,
      },
    };
  },

  async getResumeTextForUserResume(userId: string, resumeId: string): Promise<string> {
    const resume = await ResumeModel.findByUserAndId(userId, resumeId);
    if (!resume) {
      throw Object.assign(new Error('Resume not found'), {
        statusCode: 404,
        code: 'RESUME_NOT_FOUND',
      });
    }

    const buffer = await ResumeService.loadResumeFileBuffer(resume.file_url);
    const lowerName = (resume.file_name || '').toLowerCase();
    const mime = (resume.mime_type || '').toLowerCase();

    if (mime.includes('pdf') || lowerName.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const parsedPdf = await pdfParse(buffer);
      const text = String(parsedPdf?.text || '').trim();
      if (text) return text;
    }

    const parsed = await parseResume(buffer, {
      filename: resume.file_name,
      mimeType: resume.mime_type || undefined,
    });

    const parsedText = [
      parsed.rawText,
      parsed.name || '',
      Array.isArray(parsed.skills) ? parsed.skills.join(', ') : '',
      Array.isArray(parsed.experience)
        ? parsed.experience
            .map((item) => [item.role || '', item.company || ''].filter(Boolean).join(' at '))
            .join('\n')
        : '',
      Array.isArray(parsed.education)
        ? parsed.education
            .map((item) => [item.degree || '', item.institution || ''].filter(Boolean).join(' - '))
            .join('\n')
        : '',
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    return parsedText;
  },

  async loadResumeFileBuffer(fileUrl: string): Promise<Buffer> {
    if (!fileUrl) {
      throw Object.assign(new Error('Resume file URL missing'), {
        statusCode: 400,
        code: 'RESUME_URL_MISSING',
      });
    }

    if (fileUrl.startsWith('/uploads/')) {
      const relativePath = fileUrl.replace(/^\/+/, '');
      const fullPath = path.join(__dirname, '../../', relativePath);
      return fs.readFile(fullPath);
    }

    const response = await fetch(fileUrl);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    throw Object.assign(new Error('Failed to download resume file'), {
      statusCode: 502,
      code: 'RESUME_FILE_FETCH_FAILED',
      details: {
        storedUrl: fileUrl,
        lastStatus: response.status,
      },
    });
  },

  async setDefaultResume(userId: string, resumeId: string): Promise<ResumeListItem> {
    const resume = await withTransaction(async (client) => {
      return ResumeModel.setDefaultResume(userId, resumeId, client);
    });
    ResumeService.audit('resume.set_default', { userId, resumeId, newDefaultId: resume.id });
    return resume;
  },

  async deleteResume(userId: string, resumeId: string): Promise<Omit<ResumeDeleteResult, 'deletedUrl'>> {
    const result = await withTransaction(async (client) => {
      return ResumeModel.deleteResume(userId, resumeId, client);
    });

    await StorageService.deleteByUrl(result.deletedUrl).catch(() => undefined);

    const { deletedUrl: _omit, ...rest } = result;
    ResumeService.audit('resume.delete', {
      userId,
      deletedId: result.deletedId,
      reassignedDefaultId: result.newDefault?.id ?? null,
    });
    return rest;
  },

  async scoreATS(resumeText: string, jobDescription: string): Promise<ATSResult> {
    const defaultFail: ATSResult = {
      score: 0,
      missingKeywords: [],
      semanticSimilarityScore: 0,
      sectionScores: { skillsScore: 0, experienceScore: 0, keywordsScore: 0 },
      keywordDensity: {},
      explanation: "Analysis failed or missing data.",
      feedback: { missingSections: [], weakAreas: [], improvements: [] },
      qualityScore: 0,
      rolePrediction: "Unknown",
      experience: "Unknown"
    };

    if (!resumeText || !jobDescription) return defaultFail;

    try {
      const { ATSService } = require('./ats.service');

      // Extract skills from resume text using common skills matching
      const COMMON_SKILLS = [
        'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'Go',
        'Rust', 'SQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes',
        'AWS', 'GCP', 'Azure', 'Git', 'GraphQL', 'REST', 'HTML', 'CSS',
        'Tailwind', 'Next.js', 'Vue', 'Angular', 'Spring', 'Django', 'FastAPI',
        'C++', 'C#', 'Swift', 'Kotlin', 'Flutter', 'Machine Learning',
        'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Linux', 'Terraform',
      ];
      const upperResumeText = resumeText.toUpperCase();
      const resumeSkills = COMMON_SKILLS.filter(s => upperResumeText.includes(s.toUpperCase()));

      // Extract job skills from description similarly
      const upperJobDesc = jobDescription.toUpperCase();
      const jobSkills = COMMON_SKILLS.filter(s => upperJobDesc.includes(s.toUpperCase()));

      const atsResult = ATSService.calculateATSScore(
        {
          skills: resumeSkills,
          experienceText: resumeText,
          fullText: resumeText,
        },
        {
          skills: jobSkills,
          description: jobDescription,
        },
      );

      const result: ATSResult = {
        score: atsResult.totalScore,
        missingKeywords: atsResult.missingSkills.slice(0, 10),
        semanticSimilarityScore: atsResult.sectionScores.keywordsScore,
        sectionScores: {
          skillsScore: atsResult.sectionScores.skillsScore,
          experienceScore: atsResult.sectionScores.experienceScore,
          keywordsScore: atsResult.sectionScores.keywordsScore,
        },
        keywordDensity: {},
        explanation: `Deterministic ATS analysis: skills=${atsResult.sectionScores.skillsScore}%, experience=${atsResult.sectionScores.experienceScore}%, keywords=${atsResult.sectionScores.keywordsScore}%. Matched ${atsResult.matchedSkills.length} of ${atsResult.debug.jobSkillCount} required skills.`,
        feedback: {
          missingSections: [],
          weakAreas: atsResult.missingSkills.length > 3 ? ['Skills gap detected'] : [],
          improvements: atsResult.missingSkills.length > 0
            ? [`Consider adding skills: ${atsResult.missingSkills.slice(0, 5).join(', ')}`]
            : [],
        },
        qualityScore: Math.min(100, atsResult.totalScore + 10),
        rolePrediction: "Analysis based on skills profile",
        experience: "See resume details",
      };

      // Optional: LLM enrichment if available
      if (process.env.OPENAI_API_KEY) {
        try {
          const prompt = `You are a strict, senior technical recruiter AI parsing a resume string against a job description.
          You must output ONLY valid JSON without any markdown formatting.
          Analyze the exact raw resume text and job description provided below.
          
          Calculate based exactly on real industry expectations:
          1. keywordDensity: top 3 most repeated tech skill keywords and their frequencies in the resume.
          2. explanation: highly specific 2-sentence rationale for the overall resume strength compared to the job description.
          3. feedback: { "missingSections": [], "weakAreas": [], "improvements": ["Actionable suggestion 1", "Suggestion 2"] }
          4. qualityScore: 0 to 100 purely based on grammar, wording, length optimization, and detail. Deduct heavily for duplicate filler content.
          5. rolePrediction: The best job title the candidate actually deserves based solely on the resume.
          6. experience: Calculate total years/months from chronological dates found in the resume (e.g. "5 Years 2 Months"). Return "0 Years" if none found.

          Resume Text: "${resumeText.substring(0, 3000)}"
          Job Description: "${jobDescription.substring(0, 1500)}"
          
          JSON schema required:
          {
            "keywordDensity": { "keywordString": number },
            "explanation": string,
            "feedback": { "missingSections": [string], "weakAreas": [string], "improvements": [string] },
            "qualityScore": number,
            "rolePrediction": string,
            "experience": string
          }`;

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              temperature: 0.1,
              response_format: { type: 'json_object' },
              messages: [{ role: 'system', content: prompt }]
            })
          });

          if (response.ok) {
            const data: any = await response.json();
            const p = JSON.parse(data.choices[0].message.content) as any;
            result.keywordDensity = p.keywordDensity || result.keywordDensity;
            result.explanation = p.explanation || result.explanation;
            result.feedback = p.feedback || result.feedback;
            result.qualityScore = p.qualityScore || result.qualityScore;
            result.rolePrediction = p.rolePrediction || result.rolePrediction;
            result.experience = p.experience || result.experience;
          }
        } catch (llmError) {
          console.warn('[ATS] LLM enrichment failed, using deterministic scores:', llmError);
        }
      }

      return result;
    } catch (error) {
      console.error('[ATS] Scoring error:', error);
      return defaultFail;
    }
  },

  async getSecureUrl(userId: string, role: string, resumeId: string): Promise<string> {
    const { rows } = await pool.query(`SELECT user_id, file_url, mime_type FROM resumes WHERE id = $1 LIMIT 1`, [resumeId]);
    const resume = rows[0];

    if (!resume) {
      throw Object.assign(new Error('Resume not found'), {
        statusCode: 404,
        code: 'RESUME_NOT_FOUND',
      });
    }

    let isAuthorized = false;

    if (role === 'admin') {
      isAuthorized = true;
    } else if (role === 'applicant' && resume.user_id === userId) {
      isAuthorized = true;
    } else if (role === 'recruiter') {
      // Check if there is an application linking this recruiter to this resume
      const { rows: appRows } = await pool.query(
        `SELECT 1 FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE j.recruiter_id = $1 AND (a.resume_id = $2 OR a.applicant_id = $3)
         LIMIT 1`,
        [userId, resumeId, resume.user_id]
      );
      if (appRows.length > 0) isAuthorized = true;
    }

    if (!isAuthorized) {
      throw Object.assign(new Error('Forbidden: You do not have access to this resume'), {
        statusCode: 403,
        code: 'RESUME_ACCESS_DENIED',
      });
    }

    const resourceType = resume.mime_type === 'application/pdf' ? 'image' : 'raw';
    return StorageService.generateSignedUrl(resume.file_url, resourceType);
  },
};
