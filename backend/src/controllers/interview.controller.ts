import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service';
import { sendSuccess } from '../utils/response';
import { BadRequestError } from '../utils/errors';

export const InterviewController = {
  async scheduleInterview(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId, scheduledAt } = req.body as {
        applicationId?: string;
        scheduledAt?: string;
      };

      if (!applicationId) {
        throw new BadRequestError('applicationId is required', 'APPLICATION_REQUIRED');
      }
      if (!scheduledAt) {
        throw new BadRequestError('scheduledAt is required', 'SCHEDULED_AT_REQUIRED');
      }

      const parsedDate = new Date(scheduledAt);
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestError('Invalid scheduledAt date format', 'INVALID_DATE');
      }

      const interview = await InterviewService.scheduleInterview(
        applicationId,
        parsedDate,
        req.user!,
      );

      sendSuccess(res, interview, 'Interview scheduled successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async getInterviewDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new BadRequestError('Interview ID is required', 'ID_REQUIRED');
      }

      const interview = await InterviewService.getInterviewDetails(id, req.user!);
      
      // Load current live playground state in-memory if it is live
      const liveState = InterviewService.getLiveSession(id);
      const responseData = {
        ...interview,
        liveState: liveState
          ? {
              code: liveState.code,
              language: liveState.language,
              notes: (req.user!.role === 'recruiter' || req.user!.role === 'admin') ? liveState.notes : undefined,
              participants: Array.from(liveState.participants),
            }
          : null,
      };

      sendSuccess(res, responseData, 'Interview details retrieved');
    } catch (err) {
      next(err);
    }
  },

  async listInterviews(req: Request, res: Response, next: NextFunction) {
    try {
      const interviews = await InterviewService.listUserInterviews(req.user!);
      sendSuccess(res, interviews, 'Interviews list retrieved');
    } catch (err) {
      next(err);
    }
  },

  async updateNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { notes } = req.body as { notes?: string };

      if (!id) {
        throw new BadRequestError('Interview ID is required', 'ID_REQUIRED');
      }
      if (notes === undefined) {
        throw new BadRequestError('Notes content is required', 'NOTES_REQUIRED');
      }

      const interview = await InterviewService.updateNotes(id, notes, req.user!);
      sendSuccess(res, interview, 'Notes updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async startInterview(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new BadRequestError('Interview ID is required', 'ID_REQUIRED');
      }

      const interview = await InterviewService.startInterview(id, req.user!);
      sendSuccess(res, interview, 'Interview started and live session initialized');
    } catch (err) {
      next(err);
    }
  },

  async endInterview(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { feedback, rating, codeContent, language } = req.body as {
        feedback?: string;
        rating?: number;
        codeContent?: string;
        language?: string;
      };

      if (!id) {
        throw new BadRequestError('Interview ID is required', 'ID_REQUIRED');
      }

      if (rating !== undefined && (rating < 1 || rating > 5)) {
        throw new BadRequestError('Rating must be an integer between 1 and 5', 'INVALID_RATING');
      }

      const interview = await InterviewService.endInterview(
        id,
        { feedback, rating, codeContent, language },
        req.user!,
      );

      sendSuccess(res, interview, 'Interview completed and saved successfully');
    } catch (err) {
      next(err);
    }
  },

  async transcribeAudio(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new BadRequestError('Interview ID is required', 'ID_REQUIRED');
      }

      if (!req.file) {
        throw new BadRequestError('Audio file is required', 'FILE_REQUIRED');
      }

      const text = await InterviewService.transcribeAudio(
        id,
        req.file.buffer,
        req.file.originalname,
        req.user!,
      );

      sendSuccess(res, { text }, 'Audio transcribed successfully');
    } catch (err) {
      next(err);
    }
  },

  async generateTTS(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { text } = req.body as { text?: string };

      if (!id) {
        throw new BadRequestError('Interview ID is required', 'ID_REQUIRED');
      }
      if (!text) {
        throw new BadRequestError('Text prompt is required', 'TEXT_REQUIRED');
      }

      const audioBuffer = await InterviewService.generateTTS(id, text, req.user!);
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(audioBuffer);
    } catch (err) {
      next(err);
    }
  },
};
