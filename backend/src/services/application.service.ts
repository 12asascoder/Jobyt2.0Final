import { ApplicationModel, ApplicationStatus } from '../models/application.model';
import { JobModel } from '../models/job.model';
import { NotificationModel } from '../models/notification.model';
import { withTransaction } from '../utils/transaction';
import { CreditService } from './credit.service';
import { CREDIT_COSTS } from '../config/creditCosts';

export const ApplicationService = {
  async apply(
    applicantId: string,
    jobId: string,
    data: { cover_letter?: string; resume_snapshot_url?: string },
  ) {
    return withTransaction(async (client) => {
      // 1) Job validation (transaction-scoped)
      const job = await JobModel.findById(jobId, client);
      if (!job || job.status !== 'active')
        throw Object.assign(new Error('Job not found or no longer active'), { statusCode: 404 });

      // 2) Duplicate check (transaction-scoped)
      const existing = await ApplicationModel.findByJobAndApplicant(jobId, applicantId, client);
      if (existing)
        throw Object.assign(new Error('You have already applied to this job'), { statusCode: 409 });

      // 3) Credit deduction (atomic under the same DB transaction)
      await CreditService.deductCredits(
        applicantId,
        CREDIT_COSTS.APPLY_JOB,
        'Job application',
        jobId,
        client,
      );

      // 4) Create application (transaction-scoped)
      const application = await ApplicationModel.create(
        {
          job_id: jobId,
          applicant_id: applicantId,
          ...data,
        },
        client,
      );

      // 5) Notify recruiter (transaction-scoped for consistent state)
      await NotificationModel.create(
        {
          user_id: job.recruiter_id,
          type: 'application_submitted',
          title: 'New application received',
          body: `A new applicant has applied to "${job.title}"`,
          action_url: `/recruiter/jobs/${jobId}/applications`,
        },
        client,
      );

      return application;
    });
  },

  async updateStatus(recruiterId: string, applicationId: string, status: ApplicationStatus) {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) throw Object.assign(new Error('Application not found'), { statusCode: 404 });

    const job = await JobModel.findById(application.job_id);
    if (!job || job.recruiter_id !== recruiterId)
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

    const updated = await ApplicationModel.updateStatus(applicationId, status);

    // Notify applicant
    await NotificationModel.create({
      user_id: application.applicant_id,
      type: 'application_status',
      title: 'Application status updated',
      body: `Your application for "${job.title}" is now: ${status.replace('_', ' ')}`,
      action_url: `/applications`,
    });

    return updated;
  },

  async getMyApplications(applicantId: string, page: number, limit: number) {
    return ApplicationModel.findByApplicant(applicantId, page, limit);
  },

  async getJobApplications(recruiterId: string, jobId: string, page: number, limit: number) {
    const job = await JobModel.findById(jobId);
    if (!job || job.recruiter_id !== recruiterId)
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    return ApplicationModel.findByJob(jobId, page, limit);
  },

  async getMyApplicationsWithFilters(
    applicantId: string,
    filters: { status?: ApplicationStatus; jobTitle?: string },
    page: number,
    limit: number,
  ) {
    return ApplicationModel.findByApplicantWithFilters(applicantId, filters, page, limit);
  },

  async getApplicationStatistics(applicantId: string) {
    return ApplicationModel.getApplicationStats(applicantId);
  },

  async getRecruiterApplications(recruiterId: string, page: number, limit: number) {
    return ApplicationModel.findByRecruiter(recruiterId, page, limit);
  },

  async getRecruiterApplicationsWithFilters(
    recruiterId: string,
    filters: { status?: ApplicationStatus; jobTitle?: string; applicantName?: string },
    page: number,
    limit: number,
  ) {
    return ApplicationModel.findByRecruiterWithFilters(recruiterId, filters, page, limit);
  },

  async getRecruiterApplicationsStatistics(recruiterId: string) {
    return ApplicationModel.getRecruiterApplicationStats(recruiterId);
  },
};
