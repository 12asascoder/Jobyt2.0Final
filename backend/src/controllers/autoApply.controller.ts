import { Request, Response, NextFunction } from 'express';
import { AutoApplyService } from '../services/autoApply.service';
import { sendSuccess } from '../utils/response';

export const AutoApplyController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AutoApplyService.getDashboardData(req.user!);
      sendSuccess(res, data, 'Auto-apply dashboard data retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        is_active,
        job_titles,
        locations,
        job_types,
        min_salary,
        max_applications_per_day,
      } = req.body;

      const updated = await AutoApplyService.updatePreferences(req.user!, {
        is_active: typeof is_active === 'boolean' ? is_active : undefined,
        job_titles: Array.isArray(job_titles) ? job_titles : undefined,
        locations: Array.isArray(locations) ? locations : undefined,
        job_types: Array.isArray(job_types) ? job_types : undefined,
        min_salary: min_salary !== undefined ? (min_salary === null ? null : parseInt(min_salary, 10)) : undefined,
        max_applications_per_day: max_applications_per_day !== undefined ? parseInt(max_applications_per_day, 10) : undefined,
      });

      sendSuccess(res, updated, 'Auto-apply preferences updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async applyQueueItem(req: Request, res: Response, next: NextFunction) {
    try {
      const logId = req.params.logId as string;
      const result = await AutoApplyService.applyLogEntry(req.user!.userId, logId);
      sendSuccess(res, result, 'Job application submitted successfully');
    } catch (err) {
      next(err);
    }
  },

  async removeQueueItem(req: Request, res: Response, next: NextFunction) {
    try {
      const logId = req.params.logId as string;
      await AutoApplyService.removeLogEntry(req.user!.userId, logId);
      sendSuccess(res, {}, 'Queue item dismissed successfully');
    } catch (err) {
      next(err);
    }
  },

  async triggerAutoApply(req: Request, res: Response, next: NextFunction) {
    try {
      const appliedCount = await AutoApplyService.processPendingApplies(req.user!.userId);
      sendSuccess(
        res,
        { appliedCount },
        `Auto-apply run complete. Submitted ${appliedCount} applications.`
      );
    } catch (err) {
      next(err);
    }
  },
};
