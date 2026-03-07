import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const PaymentController = {
  async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await PaymentService.getPlans();
      sendSuccess(res, plans);
    } catch (err) { next(err); }
  },

  async initiateCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await PaymentService.initiateCheckout(req.user!.userId, req.body.planId);
      sendSuccess(res, data, 'Checkout initiated', 201);
    } catch (err) { next(err); }
  },

  async stripeWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['stripe-signature'] as string;
      // req.body is the raw Buffer when using express.raw() on this route
      await PaymentService.handleStripeWebhook(req.body as Buffer, signature);
      res.json({ received: true });
    } catch (err) { next(err); }
  },

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { payments, total } = await PaymentService.getHistory(req.user!.userId, page, limit);
      sendPaginated(res, payments, total, page, limit);
    } catch (err) { next(err); }
  },
};
