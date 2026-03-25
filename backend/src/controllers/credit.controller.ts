import { Request, Response, NextFunction } from 'express';
import { CreditService } from '../services/credit.service';
import { sendSuccess, sendPaginated } from '../utils/response';

const MAX_LEDGER_LIMIT = 100;

export const CreditController = {
  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { balance, low_credit } = await CreditService.getBalanceState(req.user!.userId);
      sendSuccess(res, { balance, low_credit });
    } catch (err) {
      next(err);
    }
  },

  async getLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const rawLimit = parseInt(req.query.limit as string, 10) || 20;
      const limit = Math.min(Number.isFinite(rawLimit) ? rawLimit : 20, MAX_LEDGER_LIMIT);
      const { transactions, total } = await CreditService.getLedger(req.user!.userId, page, limit);
      sendPaginated(res, transactions, total, page, limit);
    } catch (err) {
      next(err);
    }
  },
};
