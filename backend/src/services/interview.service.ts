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
import {
  InterviewModel,
  canTransitionInterviewSession,
  AiInterviewSession,
  InterviewQuestion,
  InterviewResponse,
  InterviewReport,
  StudentReadinessScore,
  InterviewSessionStatus,
} from '../models/interview.model';
import { UserModel } from '../models/user.model';
import { forbidden, notFound, badRequest, AppError } from '../utils/appError';
import { AIService } from './ai.service';
import { PromptTemplatesService } from './promptTemplates.service';
import { ReportGeneratorService } from './reportGenerator.service';
import { aiConfig } from '../config/ai.config';
import pool from '../config/database';


const LOG_PREFIX = '[InterviewService]';

export const InterviewService = {
  /**
   * Helper to assert student exists and is not banned
   */
  async _assertActiveStudent(studentId: string): Promise<void> {
    const student = await UserModel.findById(studentId);
    if (!student) {
      throw notFound('Student');
    }
    if (student.banned_at) {
      throw forbidden('Student account is banned');
    }
  },

  /**
   * Helper to fetch a session and assert ownership
   */
  async _getAndAssertSessionOwnership(studentId: string, sessionId: string): Promise<AiInterviewSession> {
    const session = await InterviewModel.findSessionById(sessionId);
    if (!session) {
      throw notFound('Interview session');
    }
    if (session.student_id !== studentId) {
      throw forbidden('Forbidden: You do not own this session');
    }
    return session;
  },

  /**
   * Helper to perform validated status transition
   */
  async _transitionSessionStatus(
    session: AiInterviewSession,
    targetStatus: InterviewSessionStatus,
    updates: Partial<Pick<AiInterviewSession, 'overall_score' | 'rubric_scores' | 'completed_at' | 'report_url'>> = {},
  ): Promise<AiInterviewSession> {
    if (!canTransitionInterviewSession(session.status, targetStatus)) {
      throw badRequest(`Invalid status transition from '${session.status}' to '${targetStatus}'`);
    }

    // SESSION RULES: A session may NOT transition: created -> questions_generated
    // unless valid interview questions have been generated and stored.
    if (targetStatus === 'questions_generated') {
      const questions = await InterviewModel.findQuestionsBySessionId(session.id);
      if (!questions || questions.length === 0) {
        throw badRequest("Cannot transition to 'questions_generated' because no questions have been stored for this session");
      }
    }

    console.log(`${LOG_PREFIX} Transitioning session ${session.id} from '${session.status}' to '${targetStatus}'`);
    return InterviewModel.updateSession(session.id, {
      status: targetStatus,
      ...updates,
    });
  },

  /**
   * Helper to generate interview questions using Claude
   */
  async generateQuestions(
    roleTitle: string,
    jobDescription: string | null,
    questionCount: number,
  ): Promise<{ questionText: string; category: 'technical' | 'behavioral' | 'situational'; expectedTopics: string[] }[]> {
    const templateName = 'interview_session_questions';
    const variables = {
      roleTitle,
      jobDescription: jobDescription || 'Not specified',
      questionCount,
    };

    const prompt = PromptTemplatesService.renderTemplate(templateName, variables);

    const validateSchema = (parsed: any): boolean => {
      if (!parsed || typeof parsed !== 'object') return false;
      if (!Array.isArray(parsed.questions)) return false;
      if (parsed.questions.length !== questionCount) return false;
      for (const q of parsed.questions) {
        if (!q || typeof q !== 'object') return false;
        if (typeof q.questionText !== 'string' || !q.questionText.trim()) return false;
        if (!['technical', 'behavioral', 'situational'].includes(q.category)) return false;
        if (!Array.isArray(q.expectedTopics)) return false;
        for (const topic of q.expectedTopics) {
          if (typeof topic !== 'string' || !topic.trim()) return false;
        }
      }
      return true;
    };

    let attempts = 0;
    const maxAttempts = 2; // Initial attempt + 1 retry

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`${LOG_PREFIX} Generating questions via Claude: attempt ${attempts}/${maxAttempts}`);
        const parsed = await AIService.generateJSON<any>(prompt, { provider: 'claude' });
        
        if (validateSchema(parsed)) {
          return parsed.questions.map((q: any) => ({
            questionText: q.questionText.trim(),
            category: q.category as 'technical' | 'behavioral' | 'situational',
            expectedTopics: q.expectedTopics.map((t: any) => t.trim()),
          }));
        } else {
          console.warn(`${LOG_PREFIX} Invalid Claude questions output schema or length mismatch on attempt ${attempts}`);
        }
      } catch (err: any) {
        console.error(`${LOG_PREFIX} Claude question generation failed on attempt ${attempts}: ${err.message}`);
      }
    }

    throw new AppError('Failed to generate interview questions after retries. Please verify your AI provider settings and credits.', 500, 'AI_GENERATION_FAILED');
  },

  /**
   * Create a new interview session
   */
  async createSession(
    studentId: string,
    roleTitle: string,
    jobDescription?: string,
    jobId?: string,
    questionCount?: number,
  ): Promise<AiInterviewSession> {
    await this._assertActiveStudent(studentId);

    const count = questionCount || aiConfig.defaultQuestionCount;

    // Create session in 'created' state
    let session = await InterviewModel.createSession({
      student_id: studentId,
      role_title: roleTitle.trim(),
      job_description: jobDescription?.trim() || null,
      job_id: jobId || null,
      session_type: 'text_async',
      mode: 'mock',
    });

    console.log(`${LOG_PREFIX} Created session ${session.id} for student ${studentId}. Generating ${count} questions...`);

    // Generate questions from AI
    const questions = await this.generateQuestions(
      roleTitle.trim(),
      jobDescription?.trim() || null,
      count,
    );

    // Save each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await InterviewModel.createQuestion({
        session_id: session.id,
        question_text: q.questionText,
        category: q.category,
        order_index: i + 1,
      });
    }

    // Transition session status to 'questions_generated'
    session = await this._transitionSessionStatus(session, 'questions_generated');

    return session;
  },

  /**
   * List all mock interview sessions for a student
   */
  async listSessions(studentId: string): Promise<AiInterviewSession[]> {
    await this._assertActiveStudent(studentId);
    return InterviewModel.findSessionsByStudent(studentId);
  },

  /**
   * Retrieve a session by ID
   */
  async getSession(studentId: string, sessionId: string): Promise<AiInterviewSession> {
    await this._assertActiveStudent(studentId);
    return this._getAndAssertSessionOwnership(studentId, sessionId);
  },

  /**
   * Helper to evaluate a response text using Claude
   */
  async evaluateResponse(
    questionText: string,
    candidateResponse: string,
  ): Promise<{
    scores: {
      communicationClarity: number;
      contentRelevance: number;
      responseStructure: number;
      depthOfKnowledge: number;
      confidenceIndicators: number;
    };
    feedbackText: string;
    suggestedImprovements: string;
  }> {
    const templateName = 'interview_response_evaluation';
    const variables = {
      questionText,
      candidateResponse,
    };

    const prompt = PromptTemplatesService.renderTemplate(templateName, variables);

    const validateSchema = (parsed: any): boolean => {
      if (!parsed || typeof parsed !== 'object') return false;
      if (!parsed.scores || typeof parsed.scores !== 'object') return false;
      const rubrics = [
        'communicationClarity',
        'contentRelevance',
        'responseStructure',
        'depthOfKnowledge',
        'confidenceIndicators',
      ];
      for (const rub of rubrics) {
        const score = parsed.scores[rub];
        if (typeof score !== 'number' || score < 0 || score > 100) return false;
      }
      if (typeof parsed.feedbackText !== 'string' || !parsed.feedbackText.trim()) return false;
      if (typeof parsed.suggestedImprovements !== 'string' || !parsed.suggestedImprovements.trim()) return false;
      return true;
    };

    let attempts = 0;
    const maxAttempts = 2; // Initial attempt + 1 retry

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`${LOG_PREFIX} Evaluating response via Claude: attempt ${attempts}/${maxAttempts}`);
        const parsed = await AIService.generateJSON<any>(prompt, { provider: 'claude' });
        
        if (validateSchema(parsed)) {
          return {
            scores: {
              communicationClarity: Math.round(parsed.scores.communicationClarity),
              contentRelevance: Math.round(parsed.scores.contentRelevance),
              responseStructure: Math.round(parsed.scores.responseStructure),
              depthOfKnowledge: Math.round(parsed.scores.depthOfKnowledge),
              confidenceIndicators: Math.round(parsed.scores.confidenceIndicators),
            },
            feedbackText: parsed.feedbackText.trim(),
            suggestedImprovements: parsed.suggestedImprovements.trim(),
          };
        } else {
          console.warn(`${LOG_PREFIX} Invalid Claude evaluation output schema or score range on attempt ${attempts}`);
        }
      } catch (err: any) {
        console.error(`${LOG_PREFIX} Claude evaluation failed on attempt ${attempts}: ${err.message}`);
      }
    }

    throw new AppError('Failed to evaluate candidate response after retries. Please check your AI provider settings and credits.', 500, 'AI_EVALUATION_FAILED');
  },

  /**
   * Submit candidate response for a specific question
   */
  async submitResponse(
    studentId: string,
    sessionId: string,
    questionId: string,
    responseText: string,
  ): Promise<InterviewResponse> {
    await this._assertActiveStudent(studentId);
    let session = await this._getAndAssertSessionOwnership(studentId, sessionId);

    // Validate request body
    const trimmedResponse = responseText?.trim();
    if (!trimmedResponse) {
      throw badRequest('Response text cannot be empty');
    }

    // Auto-transition session to in_progress if it was in questions_generated
    if (session.status === 'questions_generated') {
      session = await this._transitionSessionStatus(session, 'in_progress');
    }

    if (session.status !== 'in_progress') {
      throw badRequest(`Cannot submit responses for a session with status '${session.status}'`);
    }

    // Verify the question belongs to this session
    const questions = await InterviewModel.findQuestionsBySessionId(sessionId);
    const questionObj = questions.find((q) => q.id === questionId);
    if (!questionObj) {
      throw badRequest('Question does not belong to this interview session');
    }

    // Evaluate response using AI
    const evaluation = await this.evaluateResponse(questionObj.question_text, trimmedResponse);
    const scoreSum =
      evaluation.scores.communicationClarity +
      evaluation.scores.contentRelevance +
      evaluation.scores.responseStructure +
      evaluation.scores.depthOfKnowledge +
      evaluation.scores.confidenceIndicators;
    const aiScore = Math.round(scoreSum / 5);

    // Save response
    const response = await InterviewModel.createOrUpdateResponse({
      question_id: questionId,
      session_id: sessionId,
      student_id: studentId,
      response_text: trimmedResponse,
      ai_score: aiScore,
      rubric_scores: evaluation.scores,
      ai_feedback: {
        feedbackText: evaluation.feedbackText,
        suggestedImprovements: evaluation.suggestedImprovements,
      },
      evaluated_at: new Date(),
    });

    console.log(`${LOG_PREFIX} Response submitted and evaluated for question ${questionId} in session ${sessionId}`);
    return response;
  },

  /**
   * Complete interview session
   */
  async completeSession(studentId: string, sessionId: string): Promise<AiInterviewSession> {
    await this._assertActiveStudent(studentId);
    let session = await this._getAndAssertSessionOwnership(studentId, sessionId);

    // 1. Transition to 'completed' with completed_at
    session = await this._transitionSessionStatus(session, 'completed', {
      completed_at: new Date(),
    });

    // 2. Fetch questions and responses to calculate aggregates
    const questions = await InterviewModel.findQuestionsBySessionId(sessionId);
    const responses = await InterviewModel.findResponsesBySessionId(sessionId);

    const completedResponses = responses.filter(r => r.ai_score !== null);
    
    // Default aggregates if no responses
    let averageOverallScore = 0;
    let averageRubrics = {
      communicationClarity: 0,
      contentRelevance: 0,
      responseStructure: 0,
      depthOfKnowledge: 0,
      confidenceIndicators: 0,
    };

    if (completedResponses.length > 0) {
      const sumRubrics = {
        communicationClarity: 0,
        contentRelevance: 0,
        responseStructure: 0,
        depthOfKnowledge: 0,
        confidenceIndicators: 0,
      };
      let scoreSum = 0;

      for (const resp of completedResponses) {
        scoreSum += resp.ai_score!;
        const rubrics = typeof resp.rubric_scores === 'string' ? JSON.parse(resp.rubric_scores) : resp.rubric_scores;
        if (rubrics) {
          sumRubrics.communicationClarity += rubrics.communicationClarity ?? 0;
          sumRubrics.contentRelevance += rubrics.contentRelevance ?? 0;
          sumRubrics.responseStructure += rubrics.responseStructure ?? 0;
          sumRubrics.depthOfKnowledge += rubrics.depthOfKnowledge ?? 0;
          sumRubrics.confidenceIndicators += rubrics.confidenceIndicators ?? 0;
        }
      }

      const numResponses = completedResponses.length;
      averageOverallScore = Math.round(scoreSum / numResponses);
      averageRubrics = {
        communicationClarity: Math.round(sumRubrics.communicationClarity / numResponses),
        contentRelevance: Math.round(sumRubrics.contentRelevance / numResponses),
        responseStructure: Math.round(sumRubrics.responseStructure / numResponses),
        depthOfKnowledge: Math.round(sumRubrics.depthOfKnowledge / numResponses),
        confidenceIndicators: Math.round(sumRubrics.confidenceIndicators / numResponses),
      };
    }

    // Transition to 'evaluated'
    session = await this._transitionSessionStatus(session, 'evaluated', {
      overall_score: averageOverallScore,
      rubric_scores: averageRubrics,
    });

    // 3. Update Readiness Score (Task 7)
    // Find all completed/evaluated sessions for this student
    const { rows: completedSessions } = await pool.query(
      `SELECT * FROM ai_interview_sessions
       WHERE student_id = $1 AND status IN ('evaluated', 'report_generated')
       ORDER BY completed_at ASC`,
      [studentId]
    );

    const scores = completedSessions.map((s: any) => s.overall_score).filter((s: any): s is number => s !== null);
    const N = scores.length;
    let newScore = 0;
    if (N === 1) {
      newScore = scores[0];
    } else if (N === 2) {
      newScore = Math.round(0.6 * scores[1] + 0.4 * scores[0]);
    } else if (N >= 3) {
      const S_N = scores[N - 1];
      const S_N_minus_1 = scores[N - 2];
      const priorScores = scores.slice(0, N - 2);
      const histAvg = priorScores.reduce((sum: number, val: number) => sum + val, 0) / priorScores.length;
      newScore = Math.round(0.5 * S_N + 0.3 * S_N_minus_1 + 0.2 * histAvg);
    }

    // Previous readiness score check
    const prevReadiness = await InterviewModel.findReadinessScore(studentId);
    const previousScore = prevReadiness ? prevReadiness.current_score : null;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (previousScore !== null) {
      const diff = newScore - previousScore;
      if (diff >= 2) {
        trend = 'improving';
      } else if (diff <= -2) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }
    }

    await InterviewModel.updateReadinessScore(studentId, newScore, trend, sessionId);
    await InterviewModel.createReadinessHistory({
      student_id: studentId,
      session_id: sessionId,
      previous_score: previousScore,
      interview_score: averageOverallScore,
      new_score: newScore,
      trend,
    });

    // 4. Generate Summary / Evaluation details using Claude (Task 9)
    let summaryText = 'The candidate completed the mock interview session.';
    let strengths = ['Completed all questions in the session.'];
    let weaknesses = ['No major weaknesses identified.'];
    let recommendations = ['Continue practicing mock interviews to refine skills.'];

    try {
      const reportPrompt = `
You are an elite talent developer and interviewer evaluator. Analyze the candidate's interview session for the role of "${session.role_title}".
Here is the job description context (if any): "${session.job_description || 'Not specified'}".

Here are the questions, candidate responses, and individual evaluations:
${questions.map((q, idx) => {
  const resp = responses.find(r => r.question_id === q.id);
  return `
Question ${idx+1} [${q.category}]: ${q.question_text}
Candidate Response: ${resp ? resp.response_text : 'No response provided'}
Score: ${resp ? resp.ai_score : 'N/A'}
Feedback: ${resp ? (typeof resp.ai_feedback === 'string' ? resp.ai_feedback : JSON.stringify(resp.ai_feedback)) : 'N/A'}
`;
}).join('\n')}

Based on this complete session, provide:
1. summaryText: A cohesive, high-level summary of the candidate's performance, identifying major patterns, overall readiness, and domain competency.
2. strengths: An array of exactly 3 specific, detailed strengths demonstrated by the candidate across their responses (e.g. "Excellent articulation of React lifecycle hooks...").
3. weaknesses: An array of exactly 3 specific, constructive weaknesses or gaps identified (e.g. "Lacks depth in explaining database scaling trade-offs...").
4. recommendations: An array of exactly 3 actionable, structured study or preparation recommendations to address those gaps (e.g. "Review system design concepts, specifically sharding vs. replication...").

Output STRICTLY as a valid JSON object matching the required schema. Do not wrap in markdown code blocks.

JSON Schema:
{
  "summaryText": "String summary...",
  "strengths": ["string1", "string2", "string3"],
  "weaknesses": ["string1", "string2", "string3"],
  "recommendations": ["string1", "string2", "string3"]
}
`;

      console.log(`${LOG_PREFIX} Generating session summary/feedback via Claude for report...`);
      const summaryParsed = await AIService.generateJSON<any>(reportPrompt, { provider: 'claude' });
      if (summaryParsed && typeof summaryParsed === 'object') {
        if (typeof summaryParsed.summaryText === 'string') summaryText = summaryParsed.summaryText;
        if (Array.isArray(summaryParsed.strengths)) strengths = summaryParsed.strengths.slice(0, 3);
        if (Array.isArray(summaryParsed.weaknesses)) weaknesses = summaryParsed.weaknesses.slice(0, 3);
        if (Array.isArray(summaryParsed.recommendations)) recommendations = summaryParsed.recommendations.slice(0, 3);
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Claude report summary generation failed, using defaults:`, err);
    }

    // Assemble question analysis list for the DB report
    const questionAnalysis = questions.map((q) => {
      const resp = responses.find(r => r.question_id === q.id);
      return {
        question_id: q.id,
        question_text: q.question_text,
        category: q.category,
        response_text: resp?.response_text || '',
        ai_score: resp?.ai_score || null,
        rubric_scores: resp?.rubric_scores || null,
        ai_feedback: resp?.ai_feedback || null,
      };
    });

    // 5. Generate and upload PDF report via Puppeteer
    let reportUrl: string | null = null;
    try {
      reportUrl = await ReportGeneratorService.generatePdfReport(
        session,
        questions,
        responses,
        summaryText,
        strengths,
        weaknesses,
        recommendations,
      );
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to generate PDF report:`, err);
    }

    // Save report in interview_reports
    await InterviewModel.createReport({
      session_id: sessionId,
      student_id: studentId,
      job_id: session.job_id,
      overall_score: averageOverallScore,
      rubric_scores: averageRubrics,
      summary_text: summaryText,
      strengths,
      weaknesses,
      recommendations,
      question_analysis: questionAnalysis,
      report_url: reportUrl,
    });

    // Transition session to 'report_generated' and set report_url
    session = await this._transitionSessionStatus(session, 'report_generated', {
      report_url: reportUrl,
    });

    return session;
  },

  /**
   * Retrieve session evaluation report
   */
  async getReport(studentId: string, sessionId: string): Promise<InterviewReport> {
    await this._assertActiveStudent(studentId);
    await this._getAndAssertSessionOwnership(studentId, sessionId);

    const report = await InterviewModel.findReportBySessionId(sessionId);
    if (!report) {
      throw notFound('Report not generated yet for this session');
    }

    return report;
  },

  /**
   * Fetch latest readiness score tracking
   */
  async getReadinessScore(studentId: string): Promise<StudentReadinessScore | null> {
    await this._assertActiveStudent(studentId);
    return InterviewModel.findReadinessScore(studentId);
  },
};
