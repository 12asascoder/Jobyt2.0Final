import { JobModel, JobFilters, JobType, JobStatus } from '../models/job.model';
import { CreditService } from './credit.service';
import { UserModel } from '../models/user.model';
import { AppError, badRequest } from '../utils/appError';

export const JobService = {
  async createJob(
    recruiterId: string,
    data: {
      title: string;
      description: string;
      type?: JobType;
      location?: string;
      salary_min?: number;
      salary_max?: number;
      skills?: string[];
      status?: JobStatus;
    },
  ) {
    const recruiter = await UserModel.findById(recruiterId);
    if (!recruiter) {
      throw new AppError('Recruiter not found', 404);
    }
    if (recruiter.banned_at) {
      throw new AppError('Recruiter account is banned', 403);
    }

    const isDuplicate = await JobModel.checkDuplicate(recruiterId, data.title);
    if (isDuplicate) {
      throw Object.assign(new Error('You already have an active or draft job with this title'), { statusCode: 409 });
    }

    if (data.status === 'active') {
      await CreditService.deductJobPostingCredits(recruiterId);
    }
    return JobModel.create({ recruiter_id: recruiterId, ...data });
  },

  async publishJob(recruiterId: string, jobId: string) {
    const job = await JobModel.findById(jobId);
    if (!job) throw Object.assign(new Error('Job not found'), { statusCode: 404 });
    if (job.recruiter_id !== recruiterId)
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    if (job.status === 'active')
      throw Object.assign(new Error('Job is already active'), { statusCode: 400 });

    await CreditService.deductJobPostingCredits(recruiterId);
    return JobModel.update(jobId, { status: 'active' });
  },

  async searchJobs(filters: JobFilters) {
    return JobModel.search(filters);
  },

  async getJobById(id: string) {
    const job = await JobModel.findById(id);
    if (!job) throw Object.assign(new Error('Job not found'), { statusCode: 404 });
    await JobModel.incrementViews(id);
    return job;
  },

  async updateJob(jobId: string, recruiterId: string, data: Parameters<typeof JobModel.update>[1]) {
    const job = await JobModel.findById(jobId);
    if (!job) throw Object.assign(new Error('Job not found'), { statusCode: 404 });
    if (job.recruiter_id !== recruiterId)
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

    const allowedFields = ['title', 'description', 'location', 'salary_min', 'salary_max', 'type', 'skills'] as const;
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([key]) => (allowedFields as readonly string[]).includes(key)),
    ) as Parameters<typeof JobModel.update>[1];

    if (Object.keys(filteredData).length === 0) {
      throw badRequest('No valid fields provided for update');
    }

    const effectiveSalaryMin =
      filteredData.salary_min !== undefined ? Number(filteredData.salary_min) : job.salary_min;
    const effectiveSalaryMax =
      filteredData.salary_max !== undefined ? Number(filteredData.salary_max) : job.salary_max;

    if (
      effectiveSalaryMin !== null &&
      effectiveSalaryMax !== null &&
      effectiveSalaryMax < effectiveSalaryMin
    ) {
      throw badRequest('salary_max must be greater than or equal to salary_min');
    }

    return JobModel.update(jobId, filteredData);
  },

  async deleteJob(recruiterId: string, jobId: string) {
    const job = await JobModel.findById(jobId);
    if (!job) throw Object.assign(new Error('Job not found'), { statusCode: 404 });
    if (job.recruiter_id !== recruiterId)
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    await JobModel.softDelete(jobId);
  },

  async getRecruiterJobs(recruiterId: string) {
    return JobModel.findByRecruiter(recruiterId);
  },
};
