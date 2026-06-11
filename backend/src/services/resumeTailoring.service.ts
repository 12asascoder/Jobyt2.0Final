import puppeteer from 'puppeteer';
import { ResumeModel } from '../models/resume.model';
import { ResumeVariantModel } from '../models/resumeVariant.model';
import { ResumeService } from './resume.service';
import { StorageService } from './storage.service';
import { parseResume } from '../utils/resumeParser';
import { PromptTemplatesService } from './promptTemplates.service';
import { AIService } from './ai.service';
import pool from '../config/database';

const LOG_PREFIX = '[ResumeTailoringService]';

interface TailorSections {
  summary?: string;
  skills?: string[];
  experience?: Array<{ company?: string; role?: string; dates?: string; bullets?: string[] }>;
  education?: Array<{ institution?: string; degree?: string; dates?: string }>;
}

interface TailorLLMResult {
  tailoredSections?: TailorSections;
  changeLog?: string[];
  fabricatedRisk?: boolean;
}

function extractEntities(parsed: Awaited<ReturnType<typeof parseResume>>): Set<string> {
  const entities = new Set<string>();
  const add = (v?: string | null) => {
    const t = (v || '').trim().toLowerCase();
    if (t.length > 2) entities.add(t);
  };

  (parsed.skills || []).forEach((s) => add(s));
  (parsed.experience || []).forEach((e) => {
    add(e.company);
    add(e.role);
  });
  (parsed.education || []).forEach((e) => {
    add(e.institution);
    add(e.degree);
  });
  add(parsed.name);
  return entities;
}

function detectFabrication(source: Set<string>, tailored: TailorSections): boolean {
  const check = (value?: string) => {
    const t = (value || '').trim().toLowerCase();
    if (t.length < 3) return false;
    return !Array.from(source).some((s) => t.includes(s) || s.includes(t));
  };

  for (const exp of tailored.experience || []) {
    if (check(exp.company) || check(exp.role)) return true;
  }
  for (const edu of tailored.education || []) {
    if (check(edu.institution) || check(edu.degree)) return true;
  }
  for (const skill of tailored.skills || []) {
    if (check(skill)) return true;
  }
  return false;
}

function renderResumeHtml(sections: TailorSections, name: string): string {
  const expHtml = (sections.experience || [])
    .map(
      (e) => `
      <div style="margin-bottom:12px">
        <strong>${e.role || ''}</strong> — ${e.company || ''} <em>${e.dates || ''}</em>
        <ul>${(e.bullets || []).map((b) => `<li>${b}</li>`).join('')}</ul>
      </div>`,
    )
    .join('');

  const eduHtml = (sections.education || [])
    .map((e) => `<div>${e.degree || ''} — ${e.institution || ''} (${e.dates || ''})</div>`)
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #0b1120; font-size: 12px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin-top: 20px; border-bottom: 1px solid #ccc; }
  </style></head><body>
    <h1>${name}</h1>
    <p>${sections.summary || ''}</p>
    <h2>Skills</h2>
    <p>${(sections.skills || []).join(' · ')}</p>
    <h2>Experience</h2>
    ${expHtml}
    <h2>Education</h2>
    ${eduHtml}
  </body></html>`;
}

async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export const ResumeTailoringService = {
  async tailorForJob(
    userId: string,
    jobId: string,
    baseResumeId: string,
    queueItemId?: string,
  ) {
    const resume = await ResumeModel.findByUserAndId(userId, baseResumeId);
    if (!resume) {
      throw Object.assign(new Error('Base resume not found'), { statusCode: 404 });
    }

    const { rows: jobRows } = await pool.query(
      'SELECT title, description, skills FROM jobs WHERE id = $1',
      [jobId],
    );
    if (!jobRows.length) {
      throw Object.assign(new Error('Job not found'), { statusCode: 404 });
    }
    const job = jobRows[0];

    const buffer = await ResumeService.loadResumeFileBuffer(resume.file_url);
    const parsed = await parseResume(buffer, {
      filename: resume.file_name,
      mimeType: resume.mime_type || undefined,
    });

    const sourceEntities = extractEntities(parsed);
    const resumeJson = JSON.stringify({
      name: parsed.name,
      skills: parsed.skills,
      experience: parsed.experience,
      education: parsed.education,
      rawText: (parsed.rawText || '').slice(0, 8000),
    });

    const prompt = PromptTemplatesService.renderTemplate('resume_tailoring', {
      resumeJson,
      jobDescription: String(job.description || '').slice(0, 6000),
      jobSkills: (Array.isArray(job.skills) ? job.skills : []).join(', '),
    });

    const llmResult = (await AIService.generateJSON(prompt)) as TailorLLMResult | null;
    if (!llmResult?.tailoredSections) {
      throw Object.assign(new Error('Resume tailoring failed'), { statusCode: 502, code: 'TAILOR_FAILED' });
    }

    const fabricated =
      Boolean(llmResult.fabricatedRisk) ||
      detectFabrication(sourceEntities, llmResult.tailoredSections);

    if (fabricated) {
      throw Object.assign(new Error('Tailored resume failed validation — possible credential fabrication'), {
        statusCode: 422,
        code: 'TAILOR_FABRICATION_RISK',
      });
    }

    const html = renderResumeHtml(llmResult.tailoredSections, parsed.name || 'Candidate');
    const pdfBuffer = await htmlToPdfBuffer(html);

    const versionCount = await ResumeVariantModel.countForJob(userId, jobId);
    const versionLabel = String.fromCharCode(65 + Math.min(versionCount, 25));

    const file = {
      buffer: pdfBuffer,
      originalname: `tailored-${jobId}-${versionLabel}.pdf`,
      mimetype: 'application/pdf',
      size: pdfBuffer.length,
    } as Express.Multer.File;

    const { url } = await StorageService.uploadResume(file);

    const variant = await ResumeVariantModel.create({
      user_id: userId,
      job_id: jobId,
      base_resume_id: baseResumeId,
      version_label: versionLabel,
      snapshot_url: url,
      change_log: llmResult.changeLog || [],
      fabricated_risk: false,
      queue_item_id: queueItemId ?? null,
    });

    console.log(`${LOG_PREFIX} Created variant ${variant.id} for job ${jobId}`);
    return { variant, snapshotUrl: url };
  },
};
