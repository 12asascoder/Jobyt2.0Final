import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, query } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const oauthAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OAuth login attempts. Please try again later.',
    error: 'RATE_LIMITED',
  },
});

const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again in a minute.',
    error: 'RATE_LIMITED',
  },
});

const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many resend requests. Please try again in a minute.',
    error: 'RATE_LIMITED',
  },
});

const oauthCredentialPresence = body().custom((value) => {
  const payload = (value ?? {}) as {
    tokenOrCode?: unknown;
    idToken?: unknown;
    code?: unknown;
  };

  const hasCredential = Boolean(payload.tokenOrCode || payload.idToken || payload.code);
  if (!hasCredential) {
    throw new Error('At least one of tokenOrCode, idToken, or code is required');
  }

  return true;
});

router.post(
  '/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['applicant', 'recruiter']),
  body('referralCode').optional().isString(),
  validate,
  AuthController.register,
);

router.get('/verify-email', query('token').notEmpty(), validate, AuthController.verifyEmail);

router.post(
  '/verify-email',
  emailVerificationLimiter,
  body('token').notEmpty().isString(),
  validate,
  AuthController.verifyEmailPost,
);

router.post(
  '/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  AuthController.login,
);

router.post(
  '/google',
  oauthAuthLimiter,
  oauthCredentialPresence,
  body('idToken').notEmpty().isString(),
  validate,
  AuthController.googleLogin,
);

router.post(
  '/github',
  oauthAuthLimiter,
  body('code').notEmpty().isString(),
  body('state').notEmpty().isString(),
  validate,
  AuthController.githubLogin,
);

router.post(
  '/linkedin',
  oauthAuthLimiter,
  body('code').notEmpty().isString(),
  body('state').notEmpty().isString(),
  validate,
  AuthController.linkedinLogin,
);

router.post(
  '/refresh-token',
  body('refreshToken').notEmpty(),
  validate,
  AuthController.refreshToken,
);

router.post(
  '/forgot-password',
  body('email').isEmail().normalizeEmail(),
  validate,
  AuthController.forgotPassword,
);

router.post(
  '/reset-password',
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }),
  validate,
  AuthController.resetPassword,
);

router.get('/me', authenticate, AuthController.me);

// Dev-only: instantly verify an account without needing the email token
router.post(
  '/add-email',
  authenticate,
  emailVerificationLimiter,
  body('email').isEmail().normalizeEmail(),
  validate,
  AuthController.addEmail,
);

router.post(
  '/resend-verification',
  authenticate,
  resendVerificationLimiter,
  validate,
  AuthController.resendVerification,
);

if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/verify', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'email required' });
      return;
    }
    const pool = (await import('../config/database')).default;
    const result = await pool.query(
      `UPDATE users SET is_verified = TRUE, verify_token = NULL WHERE email = $1 RETURNING id, email`,
      [email],
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    // Grant registration credits if not already granted
    const { CreditService } = await import('../services/credit.service');
    try {
      await CreditService.grantRegistrationCredits(result.rows[0].id);
    } catch {}
    res.json({ success: true, message: `✅ ${email} verified`, data: result.rows[0] });
  });
}

export default router;
