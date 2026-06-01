import { ApplicationModel, ApplicationStatus } from '../models/application.model';
import { JobModel } from '../models/job.model';
import { NotificationModel } from '../models/notification.model';
import { PipelineEventModel } from '../models/pipeline_event.model';
import { withTransaction } from '../utils/transaction';
import { CreditService } from './credit.service';
import { CREDIT_COSTS } from '../config/creditCosts';
import { ResumeModel } from '../models/resume.model';
import { ProfileRequirementsService } from './profileRequirements.service';
import { StorageService } from './storage.service';
import { ATSService } from './ats.service';
import { AIInsightsService } from './aiInsights.service';
import { ApplicantProfileModel } from '../models/applicantProfile.model';
import { EmbeddingCacheService } from './embeddingCache.service';
import { cosineSimilarity, similarityToScore } from '../utils/embedding';
import { SkillMatchingService } from './matching/skillMatching.service';
import { ApplicantProfileModel } from '../models/applicantProfile.model';
import redis from '../config/redis';

const LOG_PREFIX = '[ApplicationService]';

export const ApplicationService = {
  async apply(
    applicantId: string,
    jobId: string,
    data: {
      cover_letter?: string;
      resume_snapshot_url?: string;
      resume_id: string;
      answers?: Array<{ question_id: string; answer: string }>;
    },
  ) {
    await ProfileRequirementsService.assertApplicantCanApply(applicantId);

    return withTransaction(async (client) => {
      // 1) Job validation (transaction-scoped)
      const job = await JobModel.findById(jobId, client);
      if (!job || job.status !== 'active')
        throw Object.assign(new Error('Job not found or no longer active'), { statusCode: 404 });

      // 2) Duplicate check (transaction-scoped)
      const existing = await ApplicationModel.findByJobAndApplicant(jobId, applicantId, client);
      if (existing)
        throw Object.assign(new Error('You have already applied to this job'), { statusCode: 409 });

      const selectedResumeId = String(data.resume_id || '').trim();
      if (!selectedResumeId) {
        throw Object.assign(new Error('Please select a resume before applying'), {
          statusCode: 422,
          code: 'RESUME_REQUIRED',
        });
      }

      const resume = await ResumeModel.findByUserAndId(applicantId, selectedResumeId);
      if (!resume) {
        throw Object.assign(new Error('Selected resume not found'), {
          statusCode: 404,
          code: 'RESUME_NOT_FOUND',
        });
      }

      const jobQuestions = Array.isArray(job.application_questions) ? job.application_questions : [];
      const submittedAnswers = Array.isArray(data.answers)
        ? data.answers
          .map((item) => ({
            question_id: String(item?.question_id || '').trim(),
            answer: String(item?.answer || '').trim(),
          }))
          .filter((item) => item.question_id.length > 0)
        : [];

      const answerMap = new Map(submittedAnswers.map((item) => [item.question_id, item.answer]));
      for (const question of jobQuestions) {
        if (!question.required) continue;
        const answer = answerMap.get(question.id) || '';
        if (!answer.trim()) {
          throw Object.assign(
            new Error(`Answer required for question: ${question.label}`),
            { statusCode: 422, code: 'MISSING_APPLICATION_ANSWER' },
          );
        }
      }
      const filteredAnswers = jobQuestions
        .map((question) => {
          const answer = answerMap.get(question.id);
          if (!answer || !answer.trim()) return null;
          return { question_id: question.id, answer: answer.trim() };
        })
        .filter((answer): answer is { question_id: string; answer: string } => Boolean(answer));

      // 3) Credit deduction (atomic under the same DB transaction)
      const { transactionId, balanceAfter } = await CreditService.deductCredits(
        applicantId,
        CREDIT_COSTS.APPLY_JOB,
        'Job application',
        jobId,
        client,
      );

      // Compute ATS score before creating application
      let atsScore = null;
      let atsBreakdown = null;
      try {
        const profile = await ApplicantProfileModel.findByUserId(applicantId);
        const resumeSkills: string[] = Array.isArray(profile?.skills) ? profile.skills : [];
        const experienceText = (profile?.experience ?? [])
          .map((e: any) => `${e.title || ''} ${e.description || ''}`).join(' ');
        const fullText = [
          profile?.bio ?? '',
          resumeSkills.join(' '),
          experienceText,
        ].join(' ');

        const atsResult = ATSService.calculateATSScore(
          { skills: resumeSkills, experienceText, fullText },
          { skills: job.skills ?? [], description: job.description ?? '' }
        );

        atsScore = atsResult.totalScore;
        atsBreakdown = atsResult;
      } catch (err) {
        console.error('[ApplicationService] Error calculating ATS score during apply:', err);
        // Continue without failing the application
      }

      // 4) Create application (transaction-scoped)
      let application;
      try {
        application = await ApplicationModel.create(
          {
            job_id: jobId,
            applicant_id: applicantId,
            cover_letter: data.cover_letter,
            resume_snapshot_url: data.resume_snapshot_url,
            resume_id: selectedResumeId,
            application_answers: filteredAnswers,
            ats_score: atsScore,
            ats_breakdown: atsBreakdown,
          },
          client,
        );
      } catch (err: unknown) {
        const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
        if (code === '23505') {
          throw Object.assign(new Error('You have already applied to this job'), { statusCode: 409 });
        }
        throw err;
      }

      // 5) Initial pipeline event
      await PipelineEventModel.create(
        {
          application_id: application.id,
          new_status: 'applied',
          changed_by_id: applicantId,
        },
        client,
      );
      // 6) Notify recruiter (transaction-scoped for consistent state)
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

      // 7) Milestone notification for recruiter on every 10 applications
      const totalApplications = await ApplicationModel.countByJob(jobId, client);
      if (totalApplications > 0 && totalApplications % 10 === 0) {
        await NotificationModel.create(
          {
            user_id: job.recruiter_id,
            type: 'application_submitted',
            title: 'Application milestone reached',
            body: `"${job.title}" has now reached ${totalApplications} applications.`,
            action_url: `/recruiter/jobs/${jobId}/applications`,
          },
          client,
        );
      }

      return {
        ...application,
        creditsRemaining: balanceAfter,
        creditTransactionId: transactionId,
        _jobForInsights: { title: job.title, description: job.description ?? '', skills: job.skills ?? [] },
        _applicantIdForInsights: applicantId,
      };
    }).then(result => {
      // Fire-and-forget: generate AI insights AFTER transaction commits (so application row exists)
      // Known risk: if server restarts in this window, insights stay NULL; auto-approve cron handles it after 7 days.
      const jobCtx = result._jobForInsights;
      const apId = result._applicantIdForInsights;
      const appId = result.id;
      // Strip internal fields from returned result
      const { _jobForInsights, _applicantIdForInsights, ...cleanResult } = result as any;
      setImmediate(async () => {
        try {
          const profile = await ApplicantProfileModel.findByUserId(apId);
          const insights = await AIInsightsService.generateInsights(
            {
              skills: Array.isArray(profile?.skills) ? profile.skills : [],
              bio: profile?.bio ?? null,
              experience: profile?.experience ?? [],
            },
            jobCtx,
          );
          if (insights) {
            await ApplicationModel.updateAIInsights(appId, {
              fit_insights: insights.fit_insights,
              rejection_reason: insights.rejection_reason,
              improvement_suggestions: insights.improvement_suggestions,
            });
            console.log(`[ApplicationService] AI insights saved for application ${appId}`);
          }
        } catch (err) {
          console.error('[ApplicationService] AI insights generation failed silently:', err);
        }
      });
      return cleanResult;
    });
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

    // Pipeline event creation
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
    const [result, profile] = await Promise.all([
      ApplicationModel.findByApplicant(applicantId, page, limit),
      ApplicantProfileModel.findByUserId(applicantId),
    ]);
    const candidateSkills: string[] = Array.isArray(profile?.skills) ? profile.skills : [];
    const enriched = result.applications.map((app: any) => {
      const jobSkills: string[] = Array.isArray(app.job_skills) ? app.job_skills : [];
      const { matchPercentage } = SkillMatchingService.calculateSkillMatch(candidateSkills, jobSkills);
      return { ...app, selectionProbability: matchPercentage };
    });
    return { ...result, applications: enriched };
  },

  async getJobApplications(recruiterId: string, jobId: string, page: number, limit: number, filters?: { search?: string; status?: string }) {
    const job = await JobModel.findById(jobId);
    if (!job || job.recruiter_id !== recruiterId)
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

    const result = await ApplicationModel.findByJob(jobId, page, limit, filters);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JobService } = require('./job.service');

    // Pre-fetch job embedding ONCE (not per applicant) to avoid N Gemini API calls.
    // If the job embedding is cached in jobs.description_embedding, this is a single DB read.
    let jobEmbedding = await EmbeddingCacheService.getJobEmbedding(jobId);
    // Fallback: try the general text-hash cache (covers jobs created before this migration)
    if (!jobEmbedding && job.description) {
      jobEmbedding = await EmbeddingCacheService.getOrGenerate(job.description);
      // Store for next time (fire-and-forget)
      if (jobEmbedding) {
        EmbeddingCacheService.storeJobEmbedding(jobId, jobEmbedding).catch(
          (err) => console.warn(`${LOG_PREFIX} Failed to cache job embedding:`, err),
        );
      }
    }

    const embeddingAvailable = Boolean(jobEmbedding);
    if (embeddingAvailable) {
      console.log(`${LOG_PREFIX} Using embedding-based ranking for job ${jobId}`);
    } else {
      console.log(`${LOG_PREFIX} Embedding unavailable for job ${jobId} — using skills-only ranking`);
    }

    const enrichedApplications = await Promise.all(result.applications.map(async (app: any) => {
      // Attempt embedding-based match score
      if (embeddingAvailable && app.resume_id && app.applicant_id) {
        try {
          const resumeEmbedding = await EmbeddingCacheService.getResumeEmbedding(
            app.resume_id,
            app.applicant_id,
          );
          if (resumeEmbedding) {
            const similarity = cosineSimilarity(resumeEmbedding, jobEmbedding!);
            const matchScore = similarityToScore(similarity);
            return { ...app, matchScore, matchMethod: 'embedding' };
          }
        } catch (err) {
          console.warn(`${LOG_PREFIX} Embedding match failed for application ${app.id}:`, err);
        }
      }

      // Fallback: skills-only match score (deterministic, always works)
      const matchResult = await JobService.calculateMatchScore(app.skills || [], job.skills || []);
      return { ...app, matchScore: matchResult.matchScore, matchMethod: 'skills' };
    }));

    // Sort by match score descending (highest similarity first)
    enrichedApplications.sort((a, b) => b.matchScore - a.matchScore);

    return { ...result, applications: enrichedApplications };
  },

  async getMyApplicationsWithFilters(
    applicantId: string,
    filters: { status?: ApplicationStatus; jobTitle?: string },
    page: number,
    limit: number,
  ) {
    const [result, profile] = await Promise.all([
      ApplicationModel.findByApplicantWithFilters(applicantId, filters, page, limit),
      ApplicantProfileModel.findByUserId(applicantId),
    ]);
    const candidateSkills: string[] = Array.isArray(profile?.skills) ? profile.skills : [];
    const enriched = result.applications.map((app: any) => {
      const jobSkills: string[] = Array.isArray(app.job_skills) ? app.job_skills : [];
      const { matchPercentage } = SkillMatchingService.calculateSkillMatch(candidateSkills, jobSkills);
      return { ...app, selectionProbability: matchPercentage };
    });
    return { ...result, applications: enriched };
  },

  async getApplicationStatistics(applicantId: string) {
    return ApplicationModel.getApplicationStats(applicantId);
  },

  async getRecruiterApplications(recruiterId: string, page: number, limit: number) {
    return ApplicationModel.findByRecruiter(recruiterId, page, limit);
  },

  async getRecruiterApplicationsWithFilters(
    recruiterId: string,
    filters: { status?: ApplicationStatus; jobTitle?: string; applicantName?: string; jobId?: string; search?: string },
    page: number,
    limit: number,
  ) {
    return ApplicationModel.findByRecruiterWithFilters(recruiterId, filters, page, limit);
  },

  async getRecruiterApplicationsStatistics(recruiterId: string) {
    return ApplicationModel.getRecruiterApplicationStats(recruiterId);
  },

  async getRecruiterApplicationDetail(recruiterId: string, applicationId: string) {
    const application = await ApplicationModel.findRecruiterApplicationById(recruiterId, applicationId);
    if (!application) {
      throw Object.assign(new Error('Application not found'), { statusCode: 404 });
    }

    // Enrich with backend-computed skill match so the frontend never needs
    // to calculate scores independently.
    const candidateSkills: string[] = Array.isArray(application.skills) ? application.skills : [];
    const jobSkills: string[] = Array.isArray(application.job_skills) ? application.job_skills : [];

    const skillMatchResult = SkillMatchingService.calculateSkillMatch(candidateSkills, jobSkills);

    return {
      ...application,
      skill_match: skillMatchResult.matchPercentage,
      matched_skills: skillMatchResult.matchedSkills,
      missing_skills: skillMatchResult.missingSkills,
      fuzzy_matched_skills: skillMatchResult.fuzzyMatchedSkills,
    };
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

  async getResumeUrl(user: { userId: string; role: string }, applicationId: string): Promise<string> {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      throw Object.assign(new Error('Application not found'), { statusCode: 404 });
    }

    if (!application.resume_snapshot_url) {
      throw Object.assign(new Error('No resume attached to this application'), { statusCode: 404 });
    }

    let isAuthorized = false;

    if (user.role === 'admin') {
      isAuthorized = true;
    } else if (user.role === 'applicant' && application.applicant_id === user.userId) {
      isAuthorized = true;
    } else if (user.role === 'recruiter') {
      const job = await JobModel.findById(application.job_id);
      if (job && job.recruiter_id === user.userId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw Object.assign(new Error('Forbidden: You do not have access to this resume'), { statusCode: 403 });
    }

    // Defaulting to PDF/image type for snapshots, as they are typically PDFs
    return StorageService.generateSignedUrl(application.resume_snapshot_url, 'image');
  },

  /** Recruiter approves the AI insights so the applicant can see them */
  async approveInsights(recruiterId: string, applicationId: string): Promise<void> {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) throw Object.assign(new Error('Application not found'), { statusCode: 404 });

    const job = await JobModel.findById(application.job_id);
    if (!job || job.recruiter_id !== recruiterId)
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

    await ApplicationModel.updateInsightsApproval(applicationId, true);
  },

  /** Applicant retrieves their AI insights (gated by approval flag) */
  async getApplicantInsights(applicantId: string, applicationId: string) {
    const fields = await ApplicationModel.getInsightsFields(applicationId);
    if (!fields) throw Object.assign(new Error('Application not found'), { statusCode: 404 });
    if (fields.applicant_id !== applicantId)
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

    if (!fields.insights_approved) {
      return { pending: true };
    }

    // Approved but AI failed to generate (empty drawer case)
    const hasContent = fields.fit_insights || fields.improvement_suggestions;
    if (!hasContent) {
      return {
        pending: false,
        unavailable: true,
        status: fields.status,
      };
    }

    return {
      pending: false,
      unavailable: false,
      status: fields.status,
      fit_insights: fields.fit_insights,
      improvement_suggestions: fields.improvement_suggestions,
      // Rejection reason only exposed if status is rejected
      rejection_reason: fields.status === 'rejected' ? fields.rejection_reason : null,
    };
  },
};

