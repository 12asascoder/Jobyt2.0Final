import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const AdminController = {
  // ── Users ────────────────────────────────────────────────────────────────────
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { users, total } = await AdminService.listUsers({
        search: req.query.search as string,
        role: req.query.role as string,
        page,
        limit,
      });
      sendPaginated(res, users, total, page, limit);
    } catch (err) { next(err); }
  },

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AdminService.getUserById(req.params.id as string);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  },

  async banUser(req: Request, res: Response, next: NextFunction) {
    try {
      await AdminService.banUser(req.user!.userId, req.params.id as string, req.body.reason);
      sendSuccess(res, null, 'User banned');
    } catch (err) { next(err); }
  },

  async unbanUser(req: Request, res: Response, next: NextFunction) {
    try {
      await AdminService.unbanUser(req.user!.userId, req.params.id as string, req.body.reason);
      sendSuccess(res, null, 'User unbanned');
    } catch (err) { next(err); }
  },

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      await AdminService.deleteUser(req.user!.userId, req.params.id as string, req.body.reason);
      sendSuccess(res, null, 'User deleted');
    } catch (err) { next(err); }
  },

  // ── Jobs ─────────────────────────────────────────────────────────────────────
  async listJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { jobs, total } = await AdminService.listJobs({
        status: req.query.status as string,
        search: req.query.search as string,
        page,
        limit,
      });
      sendPaginated(res, jobs, total, page, limit);
    } catch (err) { next(err); }
  },

  async closeJob(req: Request, res: Response, next: NextFunction) {
    try {
      await AdminService.closeJob(req.user!.userId, req.params.id as string, req.body.reason);
      sendSuccess(res, null, 'Job closed');
    } catch (err) { next(err); }
  },

  async deleteJob(req: Request, res: Response, next: NextFunction) {
    try {
      await AdminService.deleteJob(req.user!.userId, req.params.id as string, req.body.reason);
      sendSuccess(res, null, 'Job deleted');
    } catch (err) { next(err); }
  },

  // ── Credits ──────────────────────────────────────────────────────────────────
  async getAllTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { transactions, total } = await AdminService.getAllTransactions(page, limit);
      sendPaginated(res, transactions, total, page, limit);
    } catch (err) { next(err); }
  },

  async adjustCredits(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, reason } = req.body;
      await AdminService.adjustCredits(req.user!.userId, req.params.id as string, amount, reason);
      sendSuccess(res, null, 'Credits adjusted');
    } catch (err) { next(err); }
  },

  // ── Metrics ──────────────────────────────────────────────────────────────────
  async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const [metrics, dailyStats] = await Promise.all([
        AdminService.getPlatformMetrics(),
        AdminService.getDailyStats(30),
      ]);
      sendSuccess(res, { metrics, daily_stats: dailyStats });
    } catch (err) { next(err); }
  },

  // ── Audit Log ─────────────────────────────────────────────────────────────────
  async getAuditLog(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const { logs, total } = await AdminService.getAuditLog(page, limit);
      sendPaginated(res, logs, total, page, limit);
    } catch (err) { next(err); }
  },
};
