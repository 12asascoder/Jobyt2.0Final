import { ApplicantProfileModel, ApplicantProfile } from '../models/applicantProfile.model';
import { RecruiterProfileModel, RecruiterProfile } from '../models/recruiterProfile.model';
import { UserModel } from '../models/user.model';
import { JobModel } from '../models/job.model';
import { uploadToS3, deleteFromS3 } from '../utils/s3';
import { AppError } from '../utils/appError';
import { UserRole } from '../types';

// ── Profile completeness ────────────────────────────────────────────────────

const computeApplicantCompleteness = (p: ApplicantProfile): number => {
  let score = 0;
  if (p.name) score += 10;
  if (p.phone) score += 5;
  if (p.photo_url) score += 10;
  if (p.bio) score += 10;
  if (p.skills?.length >= 3) score += 15;
  if ((p.experience as unknown[])?.length >= 1) score += 20;
  if ((p.education as unknown[])?.length >= 1) score += 15;
  if (p.resume_url) score += 15;
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
      const completeness = profile ? computeApplicantCompleteness(profile) : 0;
      return {
        email: user.email,
        role: user.role,
        credit_balance: user.credit_balance,
        referral_code: user.referral_code,
        profile,
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
    let profile = await ApplicantProfileModel.findByUserId(userId);
    if (!profile) profile = await ApplicantProfileModel.create(userId);
    const updated = await ApplicantProfileModel.update(userId, data);
    return { profile: updated, completeness: computeApplicantCompleteness(updated) };
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
    const url = await uploadToS3(file.buffer, file.originalname, file.mimetype, 'resumes');
    const profile = await ApplicantProfileModel.findByUserId(userId);
    if (profile?.resume_url) {
      await deleteFromS3(profile.resume_url).catch(() => null); // ignore delete errors
    }
    await ApplicantProfileModel.update(userId, { resume_url: url });
    return { resume_url: url };
  },

  async uploadPhoto(userId: string, role: UserRole, file: Express.Multer.File) {
    const folder = role === 'recruiter' ? 'logos' : 'photos';
    const url = await uploadToS3(file.buffer, file.originalname, file.mimetype, folder);

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
      return { id: user.id, email: user.email, role: user.role, profile };
    }
    if (user.role === 'recruiter') {
      const profile = await RecruiterProfileModel.findByUserId(targetUserId);
      return { id: user.id, email: user.email, role: user.role, profile };
    }
    return { id: user.id, role: user.role };
  },
};
