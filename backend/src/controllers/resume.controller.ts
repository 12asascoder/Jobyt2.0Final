import { Request, Response, NextFunction } from 'express';
import { ResumeService } from '../services/resume.service';
import { sendSuccess } from '../utils/response';

export const ResumeController = {
  async getMyResumes(req: Request, res: Response, next: NextFunction) {
    try {
      const resumes = await ResumeService.getUserResumes(req.user!.userId);
      sendSuccess(res, { resumes });
    } catch (err) {
      next(err);
    }
  },

  async getDefaultResume(req: Request, res: Response, next: NextFunction) {
    try {
      const resume = await ResumeService.getDefaultResume(req.user!.userId);
      sendSuccess(res, { resume });
    } catch (err) {
      next(err);
    }
  },

  async setDefault(req: Request, res: Response, next: NextFunction) {
    try {
      const resume = await ResumeService.setDefaultResume(
        req.user!.userId,
        req.params.id as string,
      );
      sendSuccess(res, { resume });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ResumeService.deleteResume(req.user!.userId, req.params.id as string);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
};

