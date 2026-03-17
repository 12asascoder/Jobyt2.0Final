import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from '../services/application.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const ApplicationController = {
  async apply(req: Request, res: Response, next: NextFunction) {
    try {
      const application = await ApplicationService.apply(
        req.user!.userId,
        req.params.jobId as string,
        req.body,
      );
      sendSuccess(res, application, 'Application submitted', 201);
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const application = await ApplicationService.updateStatus(
        req.user!.userId,
        req.params.id as string,
        req.body.status,
      );
      sendSuccess(res, application, 'Status updated');
    } catch (err) {
      next(err);
    }
  },

  async myApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { applications, total } = await ApplicationService.getMyApplications(
        req.user!.userId,
        page,
        limit,
      );
      sendPaginated(res, applications, total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  async jobApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number.parseInt(req.query.page as string) || 1;
      const limit = Number.parseInt(req.query.limit as string) || 20;
      const { applications, total } = await ApplicationService.getJobApplications(
        req.user!.userId,
        req.params.jobId as string,
        page,
        limit,
      );
      sendPaginated(res, applications, total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  async myApplicationsFiltered(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number.parseInt(req.query.page as string) || 1;
      const limit = Number.parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const jobTitle = req.query.jobTitle as string | undefined;

      const { applications, total } = await ApplicationService.getMyApplicationsWithFilters(
        req.user!.userId,
        { status: status as any, jobTitle },
        page,
        limit,
      );
      sendPaginated(res, applications, total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  async getApplicationStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await ApplicationService.getApplicationStatistics(req.user!.userId);
      res.json({
        success: true,
        data: stats,
        message: 'Application statistics',
      });
    } catch (err) {
      next(err);
    }
  },
};
