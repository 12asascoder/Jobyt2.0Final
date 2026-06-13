import { InterviewModel, Interview, InterviewStatus } from '../models/interview.model';
import { ApplicationModel } from '../models/application.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { JwtPayload } from '../types';

export interface LiveSessionState {
  code: string;
  language: string;
  notes: string;
  participants: Set<string>; // active userIds in the room
}

// In-memory store for active session states (could be replaced by Redis in production)
const activeSessions = new Map<string, LiveSessionState>();

export const InterviewService = {
  async scheduleInterview(
    applicationId: string,
    scheduledAt: Date,
    requester: JwtPayload,
  ): Promise<Interview> {
    // 1. Fetch application details
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Application not found', 'APPLICATION_NOT_FOUND');
    }

    // 2. Authorize requester
    if (requester.role === 'recruiter') {
      // Find full application details to verify recruiter owns the job
      const recApplication = await ApplicationModel.findRecruiterApplicationById(
        requester.userId,
        applicationId,
      );
      if (!recApplication) {
        throw new ForbiddenError(
          'You are not authorized to schedule an interview for this application',
          'RECRUITER_FORBIDDEN',
        );
      }
    } else if (requester.role !== 'admin') {
      throw new ForbiddenError('Only recruiters and admins can schedule interviews', 'ROLE_FORBIDDEN');
    }

    // 3. Check scheduled date
    if (new Date(scheduledAt).getTime() < Date.now()) {
      throw new BadRequestError('Scheduled date must be in the future', 'INVALID_SCHEDULED_DATE');
    }

    // 4. Create interview record
    const interview = await InterviewModel.createInterview({
      application_id: applicationId,
      interviewer_id: requester.userId,
      candidate_id: application.applicant_id,
      scheduled_at: new Date(scheduledAt),
    });

    return interview;
  },

  async getInterviewDetails(interviewId: string, user: JwtPayload): Promise<Interview> {
    const interview = await InterviewModel.getById(interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found', 'INTERVIEW_NOT_FOUND');
    }

    // Authorize participant
    const isParticipant =
      interview.candidate_id === user.userId || interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenError(
        'You are not authorized to view this interview',
        'NOT_INTERVIEW_PARTICIPANT',
      );
    }

    return interview;
  },

  async listUserInterviews(user: JwtPayload): Promise<Interview[]> {
    return InterviewModel.listUserInterviews(user.userId, user.role);
  },

  async updateNotes(interviewId: string, notes: string, user: JwtPayload): Promise<Interview> {
    const interview = await this.getInterviewDetails(interviewId, user);
    
    // Only interviewer or admin can update notes
    const isInterviewer = interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isInterviewer && !isAdmin) {
      throw new ForbiddenError(
        'Only the interviewer or admin can update interview notes',
        'NOT_THE_INTERVIEWER',
      );
    }

    // Sync to in-memory session if live
    const liveSession = activeSessions.get(interviewId);
    if (liveSession) {
      liveSession.notes = notes;
    }

    // Persist to database
    return InterviewModel.updateInterview(interviewId, { notes });
  },

  async startInterview(interviewId: string, user: JwtPayload): Promise<Interview> {
    const interview = await this.getInterviewDetails(interviewId, user);

    const isInterviewer = interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isInterviewer && !isAdmin) {
      throw new ForbiddenError(
        'Only the interviewer or admin can start the interview',
        'NOT_THE_INTERVIEWER',
      );
    }

    if (interview.status === 'completed') {
      throw new BadRequestError('This interview has already been completed', 'INTERVIEW_COMPLETED');
    }

    // Initialize in-memory session state if not already done
    if (!activeSessions.has(interviewId)) {
      activeSessions.set(interviewId, {
        code: interview.code_content || '// Live coding playground\n',
        language: interview.code_language || 'javascript',
        notes: interview.notes || '',
        participants: new Set(),
      });
    }

    // Update status in DB
    const updated = await InterviewModel.updateInterview(interviewId, {
      status: 'live',
      started_at: interview.started_at || new Date(),
    });

    return updated;
  },

  async endInterview(
    interviewId: string,
    data: { feedback?: string; rating?: number; codeContent?: string; language?: string },
    user: JwtPayload,
  ): Promise<Interview> {
    const interview = await this.getInterviewDetails(interviewId, user);

    const isInterviewer = interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isInterviewer && !isAdmin) {
      throw new ForbiddenError(
        'Only the interviewer or admin can end the interview',
        'NOT_THE_INTERVIEWER',
      );
    }

    // Pull current live state from memory if available
    const liveState = activeSessions.get(interviewId);
    const finalCode = data.codeContent !== undefined ? data.codeContent : (liveState?.code || interview.code_content);
    const finalLanguage = data.language !== undefined ? data.language : (liveState?.language || interview.code_language);
    const finalNotes = liveState?.notes || interview.notes;

    // Update interview status and save the session snapshot to the database
    const updated = await InterviewModel.updateInterview(interviewId, {
      status: 'completed',
      ended_at: new Date(),
      code_content: finalCode,
      code_language: finalLanguage,
      notes: finalNotes,
      feedback: data.feedback !== undefined ? data.feedback : interview.feedback,
      rating: data.rating !== undefined ? data.rating : interview.rating,
    });

    // Advance the applicant application pipeline status to next step if applicable, or leave it as interview
    // (Optional, let's keep it isolated to this feature or sync with application status)

    // Clean up active session
    activeSessions.delete(interviewId);

    return updated;
  },

  // --- Live WebSocket Session State Methods ---
  getLiveSession(interviewId: string): LiveSessionState | null {
    return activeSessions.get(interviewId) || null;
  },

  initializeLiveSession(interviewId: string, initialCode = '', initialLanguage = 'javascript', initialNotes = ''): LiveSessionState {
    let session = activeSessions.get(interviewId);
    if (!session) {
      session = {
        code: initialCode || '// Live coding playground\n',
        language: initialLanguage || 'javascript',
        notes: initialNotes || '',
        participants: new Set(),
      };
      activeSessions.set(interviewId, session);
    }
    return session;
  },

  updateLiveCode(interviewId: string, code: string): void {
    const session = activeSessions.get(interviewId);
    if (session) {
      session.code = code;
    }
  },

  updateLiveLanguage(interviewId: string, language: string): void {
    const session = activeSessions.get(interviewId);
    if (session) {
      session.language = language;
    }
  },

  addParticipant(interviewId: string, userId: string): void {
    const session = activeSessions.get(interviewId);
    if (session) {
      session.participants.add(userId);
    }
  },

  removeParticipant(interviewId: string, userId: string): void {
    const session = activeSessions.get(interviewId);
    if (session) {
      session.participants.delete(userId);
      // Clean up empty sessions if status is completed (or leave it to garbage collection/explicit end)
    }
  },
};
