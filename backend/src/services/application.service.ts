import { ApplicationModel, ApplicationStatus } from '../models/application.model';
import { JobModel } from '../models/job.model';
import { NotificationModel } from '../models/notification.model';
import { PipelineEventModel } from '../models/pipeline_event.model';

export const ApplicationService = {
  async apply(
    applicantId: string,
    jobId: string,
    data: { cover_letter?: string; resume_snapshot_url?: string },
  ) {
    const job = await JobModel.findById(jobId);
    if (!job || job.status !== 'active')
      throw Object.assign(new Error('Job not found or no longer active'), { statusCode: 404 });

    const existing = await ApplicationModel.findByJobAndApplicant(jobId, applicantId);
    if (existing)
      throw Object.assign(new Error('You have already applied to this job'), { statusCode: 409 });

    const application = await ApplicationModel.create({
      job_id: jobId,
      applicant_id: applicantId,
      ...data,
    });

    await PipelineEventModel.create({
      application_id: application.id,
      new_status: 'APPLIED',
      changed_by_id: applicantId,
    });

    // Notify recruiter
    await NotificationModel.create({
      user_id: job.recruiter_id,
      type: 'application_submitted',
      title: 'New application received',
      body: `A new applicant has applied to "${job.title}"`,
      action_url: `/recruiter/jobs/${jobId}/applications`,
    });

    return application;
  },

  async checkApplied(applicantId: string, jobId: string) {
    const existing = await ApplicationModel.findByJobAndApplicant(jobId, applicantId);
    return { hasApplied: !!existing };
  },

  async updateStatus(user: { userId: string; role: string }, applicationId: string, status: ApplicationStatus) {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) throw Object.assign(new Error('Application not found'), { statusCode: 404 });

    const job = await JobModel.findById(application.job_id);
    if (!job || (user.role !== 'admin' && job.recruiter_id !== user.userId))
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

    const updated = await ApplicationModel.updateStatus(applicationId, status);

    await PipelineEventModel.create({
      application_id: application.id,
      previous_status: application.status,
      new_status: status,
      changed_by_id: user.userId,
    });

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

  async getEvents(user: { userId: string; role: string }, applicationId: string) {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) throw Object.assign(new Error('Application not found'), { statusCode: 404 });

    if (user.role === 'applicant' && application.applicant_id !== user.userId) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }

    if (user.role === 'recruiter') {
      const job = await JobModel.findById(application.job_id);
      if (!job || job.recruiter_id !== user.userId) {
        throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
      }
    }

    return PipelineEventModel.findByApplication(applicationId);
  },
};
