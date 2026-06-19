import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service';
import { InterviewModel } from '../models/interview.model';
import { sendSuccess } from '../utils/response';
import { badRequest } from '../utils/appError';

export const InterviewController = {
  /**
   * Start a new mock interview session and generate questions
   */
  async startSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const { roleTitle, jobDescription, questionCount } = req.body;

      if (!roleTitle || typeof roleTitle !== 'string' || !roleTitle.trim()) {
        throw badRequest('Role title is required');
      }

      let parsedCount: number | undefined;
      if (questionCount !== undefined) {
        parsedCount = parseInt(questionCount, 10);
        if (isNaN(parsedCount) || parsedCount <= 0) {
          throw badRequest('Question count must be a positive integer');
        }
      }

      const session = await InterviewService.createSession(
        studentId,
        roleTitle.trim(),
        jobDescription,
        undefined, // jobId
        parsedCount
      );

      sendSuccess(res, session, 'Interview session started and questions generated successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * List all mock interview sessions for the student
   */
  async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const sessions = await InterviewService.listSessions(studentId);
      sendSuccess(res, sessions, 'Sessions retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retrieve session details, questions, and any responses submitted so far
   */
  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const sessionId = req.params.id as string;

      const session = await InterviewService.getSession(studentId, sessionId);
      const questions = await InterviewModel.findQuestionsBySessionId(sessionId);
      const responses = await InterviewModel.findResponsesBySessionId(sessionId);

      sendSuccess(res, { session, questions, responses }, 'Session details retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Submit student's text response to a question
   */
  async submitResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const sessionId = req.params.id as string;
      const { questionId, responseText } = req.body;

      if (!questionId || typeof questionId !== 'string') {
        throw badRequest('Question ID is required');
      }
      if (!responseText || typeof responseText !== 'string' || !responseText.trim()) {
        throw badRequest('Response text is required');
      }

      const response = await InterviewService.submitResponse(
        studentId,
        sessionId,
        questionId,
        responseText.trim()
      );

      sendSuccess(res, response, 'Response submitted and evaluated successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Complete interview session, triggering score aggregation, readiness update, and report generation
   */
  async completeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const sessionId = req.params.id as string;

      const session = await InterviewService.completeSession(studentId, sessionId);

      sendSuccess(res, session, 'Interview session completed and evaluated successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retrieve performance report details for a session
   */
  async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const sessionId = req.params.id as string;

      const report = await InterviewService.getReport(studentId, sessionId);

      sendSuccess(res, report, 'Performance report retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retrieve student's current interview readiness score and progression history
   */
  async getReadiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.userId;

      const readiness = await InterviewService.getReadinessScore(studentId);
      const history = await InterviewModel.findReadinessHistory(studentId);

      sendSuccess(res, { readiness, history }, 'Readiness metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  },
};
