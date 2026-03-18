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

    const REQUIRED_CREDITS = 1;

    // Use a top level import or require pool
    const { default: dbPool } = await import('../config/database');
    const client = await dbPool.connect();
    
    let application;
    let creditsRemaining;
    let creditTransactionId;

    try {
      await client.query('BEGIN');

      // 1. Secure Credit Deduction (Atomic lock constraint)
      const creditRes = await client.query(
        `UPDATE users SET credit_balance = credit_balance - $1 WHERE id = $2 AND credit_balance >= $1 RETURNING credit_balance`,
        [REQUIRED_CREDITS, applicantId]
      );

      if (!creditRes.rows.length) {
        // Find actual balance to report
        const userRes = await client.query(`SELECT credit_balance FROM users WHERE id = $1`, [applicantId]);
        const available = userRes.rows[0]?.credit_balance || 0;
        throw Object.assign(new Error('Insufficient credits to apply for this job'), { 
          statusCode: 402, 
          requiredCredits: REQUIRED_CREDITS, 
          availableCredits: available 
        });
      }

      creditsRemaining = creditRes.rows[0].credit_balance;

      // 2. Create Application
      const appRes = await client.query(
        `INSERT INTO applications (job_id, applicant_id, cover_letter, resume_snapshot_url, status)
         VALUES ($1, $2, $3, $4, 'APPLIED') RETURNING *`,
        [jobId, applicantId, data.cover_letter || null, data.resume_snapshot_url || null]
      );
      application = appRes.rows[0];

      // 3. Create Ledger Entry
      const ledgerRes = await client.query(
        `INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, reference_id)
         VALUES ($1, 'JOB_APPLY_DEBIT', $2, $3, $4, $5) RETURNING id`,
        [applicantId, -REQUIRED_CREDITS, creditsRemaining, 'Applied for job', jobId]
      );
      creditTransactionId = ledgerRes.rows[0].id;

      // 4. Create Pipeline Event
      await client.query(
        `INSERT INTO pipeline_events (application_id, new_status, changed_by_id)
         VALUES ($1, 'APPLIED', $2)`,
        [application.id, applicantId]
      );

      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err.code === '23505') { // unique violation
         throw Object.assign(new Error('You have already applied to this job'), { statusCode: 409 });
      }
      throw err;
    } finally {
      client.release();
    }

    // Async webhooks
    NotificationModel.create({
      user_id: job.recruiter_id,
      type: 'application_submitted',
      title: 'New application received',
      body: `A new applicant has applied to "${job.title}"`,
      action_url: `/recruiter/jobs/${jobId}/applications`,
    }).catch(console.error);

    return {
      ...application,
      creditsRemaining,
      creditTransactionId
    };
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
