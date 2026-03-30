import { ApplicantProfileModel, ApplicantProfile } from '../models/applicantProfile.model';
import { RecruiterProfileModel, RecruiterProfile } from '../models/recruiterProfile.model';
import { ResumeModel } from '../models/resume.model';
import { UserModel } from '../models/user.model';
import { JobModel } from '../models/job.model';
import { StorageService } from './storage.service';
import { AppError } from '../utils/appError';
import { UserRole } from '../types';
import type { ParsedResume } from '../utils/resumeParser';

// ── Profile completeness ────────────────────────────────────────────────────

const computeApplicantCompleteness = (p: ApplicantProfile, hasResume: boolean): number => {
  let score = 0;
  if (p.name) score += 10;
  if (p.phone) score += 5;
  if (p.photo_url) score += 10;
  if (p.bio) score += 10;
  if (p.skills?.length >= 3) score += 15;
  if ((p.experience as unknown[])?.length >= 1) score += 20;
  if ((p.education as unknown[])?.length >= 1) score += 15;
  if (hasResume) score += 15;
  return Math.min(score, 100);
};

const computeRecruiterCompleteness = (p: RecruiterProfile): number => {
  let score = 0;
  if (p.name) score += 10;
  if (p.company_name) score += 20;
  if (p.industry) score += 10;
  if (p.description) score += 20;
  if (p.company_size) score += 10;
  if (p.logo_url) score += 10;
  if (p.website) score += 10;
  if (p.location) score += 10;
  return Math.min(score, 100);
};

// ── Service ─────────────────────────────────────────────────────────────────

export const UserService = {
  async getProfile(userId: string, role: UserRole) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    if (role === 'applicant') {
      const profile = await ApplicantProfileModel.findByUserId(userId);
      const [defaultResume, hasResume] = await Promise.all([
        ResumeModel.findDefaultByUserId(userId),
        ResumeModel.hasAnyResume(userId),
      ]);
      const profileOut = profile
        ? { ...profile, resume_url: defaultResume?.file_url ?? null }
        : null;
      const completeness = profile ? computeApplicantCompleteness(profile, hasResume) : 0;
      return {
        email: user.email,
        role: user.role,
        credit_balance: user.credit_balance,
        referral_code: user.referral_code,
        profile: profileOut,
        completeness,
      };
    }

    if (role === 'recruiter') {
      const profile = await RecruiterProfileModel.findByUserId(userId);
      const completeness = profile ? computeRecruiterCompleteness(profile) : 0;
      return {
        email: user.email,
        role: user.role,
        credit_balance: user.credit_balance,
        referral_code: user.referral_code,
        profile,
        completeness,
      };
    }

    return { email: user.email, role: user.role };
  },

  async updateApplicantProfile(
    userId: string,
    data: Partial<Omit<ApplicantProfile, 'user_id' | 'created_at' | 'updated_at'>>,
  ) {
    const raw = { ...data } as Record<string, unknown>;
    delete raw.resume_url;
    let profile = await ApplicantProfileModel.findByUserId(userId);
    if (!profile) profile = await ApplicantProfileModel.create(userId);
    const updated = await ApplicantProfileModel.update(
      userId,
      raw as Partial<Omit<ApplicantProfile, 'user_id' | 'created_at' | 'updated_at'>>,
    );
    const hasResume = await ResumeModel.hasAnyResume(userId);
    const defaultResume = await ResumeModel.findDefaultByUserId(userId);
    return {
      profile: { ...updated, resume_url: defaultResume?.file_url ?? null },
      completeness: computeApplicantCompleteness(updated, hasResume),
    };
  },

  async updateRecruiterProfile(
    userId: string,
    data: Partial<Omit<RecruiterProfile, 'user_id' | 'created_at' | 'updated_at'>>,
  ) {
    let profile = await RecruiterProfileModel.findByUserId(userId);
    if (!profile) profile = await RecruiterProfileModel.create(userId);
    const updated = await RecruiterProfileModel.update(userId, data);
    return { profile: updated, completeness: computeRecruiterCompleteness(updated) };
  },

  async uploadResume(userId: string, file: Express.Multer.File) {
    const { url } = await StorageService.uploadResume(file);
    const row = await ResumeModel.createDefaultForUser(userId, {
      file_url: url,
      file_name: file.originalname,
      file_size: file.size ?? Buffer.byteLength(file.buffer),
      mime_type: file.mimetype,
    });

    // Keep upload resilient: parsing is best-effort and should not block file persistence.
    if ((file.mimetype || '').toLowerCase().includes('pdf')) {
      try {
        const { parseResume } = await import('../utils/resumeParser');
        const parsed = await parseResume(file.buffer, {
          filename: file.originalname,
          mimeType: file.mimetype,
        });
        await UserService.syncParsedResumeToProfile(userId, parsed);
      } catch (err) {
        console.warn('Resume uploaded but parsing/profile sync failed:', err);
      }
    }

    return {
      resume: {
        id: row.id,
        file_url: row.file_url,
        created_at: row.created_at,
      },
    };
  },

  async syncParsedResumeToProfile(userId: string, parsed: ParsedResume) {
    let profile = await ApplicantProfileModel.findByUserId(userId);
    if (!profile) {
      profile = await ApplicantProfileModel.create(userId);
    }

    const patch: Partial<Pick<ApplicantProfile, 'name' | 'skills' | 'experience' | 'education'>> = {};

    if (!profile.name && parsed.name) {
      patch.name = parsed.name;
    }

    if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
      patch.skills = Array.from(new Set(parsed.skills.map((s) => String(s).trim()).filter(Boolean)));
    }

    if (Array.isArray(parsed.experience) && parsed.experience.length > 0) {
      patch.experience = parsed.experience;
    }

    if (Array.isArray(parsed.education) && parsed.education.length > 0) {
      patch.education = parsed.education;
    }

    if (Object.keys(patch).length > 0) {
      await ApplicantProfileModel.update(userId, patch);
    }
  },

  async uploadPhoto(userId: string, role: UserRole, file: Express.Multer.File) {
    const folder = role === 'recruiter' ? 'logos' : 'photos';
    const { url } = await StorageService.uploadPhoto(file, folder);

    if (role === 'applicant') {
      await ApplicantProfileModel.update(userId, { photo_url: url });
    } else {
      await RecruiterProfileModel.update(userId, { logo_url: url });
    }
    return { url };
  },

  // ── Saved Jobs ──────────────────────────────────────────────────────────────

  async getSavedJobs(userId: string) {
    return JobModel.getSavedJobs(userId);
  },

  async saveJob(userId: string, jobId: string) {
    await JobModel.saveJob(userId, jobId);
  },

  async unsaveJob(userId: string, jobId: string) {
    await JobModel.unsaveJob(userId, jobId);
  },

  async getPublicProfile(targetUserId: string) {
    const user = await UserModel.findById(targetUserId);
    if (!user) throw new AppError('User not found', 404);

    if (user.role === 'applicant') {
      const profile = await ApplicantProfileModel.findByUserId(targetUserId);
      const defaultResume = profile ? await ResumeModel.findDefaultByUserId(targetUserId) : null;
      const profileOut = profile
        ? { ...profile, resume_url: defaultResume?.file_url ?? null }
        : null;
      return { id: user.id, email: user.email, role: user.role, profile: profileOut };
    }
    if (user.role === 'recruiter') {
      const profile = await RecruiterProfileModel.findByUserId(targetUserId);
      return { id: user.id, email: user.email, role: user.role, profile };
    }
    return { id: user.id, role: user.role };
  },
};
