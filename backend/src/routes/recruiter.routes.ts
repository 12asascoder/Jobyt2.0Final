import { Router } from 'express';
import { body } from 'express-validator';
import { RecruiterController } from '../controllers/recruiter.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

/**
 * POST /api/v1/recruiter/profile
 * Create recruiter profile (first-time registration)
 * 
 * Middleware: authenticate → authorize('recruiter') → validate
 * Validation: company_name (required), company_email (optional, valid email)
 * 
 * Request body:
 * {
 *   "company_name": "string (required)",
 *   "company_email": "string (optional, valid email)",
 *   "industry": "string (optional)",
 *   "description": "string (optional)",
 *   "company_size": "string (optional)",
 *   "website": "string (optional)",
 *   "location": "string (optional)"
 * }
 */
router.post(
  '/profile',
  authenticate,
  authorize('recruiter'),
  body('company_name').trim().notEmpty().withMessage('Company name is required'),
  body('company_email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Company email must be a valid email address')
    .normalizeEmail(),
  body('industry').optional({ checkFalsy: true }).trim().isString(),
  body('description').optional({ checkFalsy: true }).trim().isString(),
  body('company_size').optional({ checkFalsy: true }).trim().isString(),
  body('website').optional({ checkFalsy: true }).trim().isString(),
  body('location').optional({ checkFalsy: true }).trim().isString(),
  validate,
  RecruiterController.createRecruiterProfile,
);

export default router;
