import { Request, Response, NextFunction } from 'express';
import { ReferralService } from '../services/referral.service';
import { sendSuccess } from '../utils/response';

export const ReferralController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReferralService.getDashboard(req.user!.userId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },
};
