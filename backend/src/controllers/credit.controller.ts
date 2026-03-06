import { Request, Response, NextFunction } from 'express';
import { CreditModel } from '../models/credit.model';
import { sendSuccess, sendPaginated } from '../utils/response';

export const CreditController = {
  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const balance = await CreditModel.getBalance(req.user!.userId);
      sendSuccess(res, { balance });
    } catch (err) { next(err); }
  },

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { transactions, total } = await CreditModel.getHistory(req.user!.userId, page, limit);
      sendPaginated(res, transactions, total, page, limit);
    } catch (err) { next(err); }
  },
};
