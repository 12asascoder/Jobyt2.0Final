import { type Request, type Response, type NextFunction } from 'express';
import prisma from '../config/prisma';

/**
 * Middleware to enforce email requirement for specific endpoints.
 * Prevents OAuth users with is_email_dummy=true from using email-dependent features.
 *
 * Usage:
 *   router.post('/apply', requireEmail, applicationController.create);
 *   router.post('/jobs', requireEmail, jobController.create);
 */
export const requireEmail = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  void (async () => {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { email: true, email_verified: true },
    });

    if (!user?.email || !user.email_verified) {
      res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email to continue',
        requiresVerification: true,
      });
      return;
    }

    next();
  })().catch(next);
};
