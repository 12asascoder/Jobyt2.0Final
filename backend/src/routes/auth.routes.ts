import { Router } from 'express';
import { body, query } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['applicant', 'recruiter']),
  body('referralCode').optional().isString(),
  validate,
  AuthController.register
);

router.get('/verify-email',
  query('token').notEmpty(),
  validate,
  AuthController.verifyEmail
);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  AuthController.login
);

router.post('/refresh-token',
  body('refreshToken').notEmpty(),
  validate,
  AuthController.refreshToken
);

router.post('/forgot-password',
  body('email').isEmail().normalizeEmail(),
  validate,
  AuthController.forgotPassword
);

router.post('/reset-password',
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }),
  validate,
  AuthController.resetPassword
);

router.get('/me', authenticate, AuthController.me);

// Dev-only: instantly verify an account without needing the email token
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/verify', async (req, res) => {
    const { email } = req.body;
    if (!email) { res.status(400).json({ success: false, message: 'email required' }); return; }
    const pool = (await import('../config/database')).default;
    const result = await pool.query(
      `UPDATE users SET is_verified = TRUE, verify_token = NULL WHERE email = $1 RETURNING id, email`,
      [email]
    );
    if (result.rowCount === 0) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    // Grant registration credits if not already granted
    const { CreditService } = await import('../services/credit.service');
    try { await CreditService.grantRegistrationCredits(result.rows[0].id); } catch {}
    res.json({ success: true, message: `✅ ${email} verified`, data: result.rows[0] });
  });
}

export default router;
