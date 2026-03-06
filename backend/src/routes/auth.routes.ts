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

export default router;
