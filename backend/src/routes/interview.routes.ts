import { Router } from 'express';
import { body, param } from 'express-validator';
import { InterviewController } from '../controllers/interview.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Protect all mock interview routes under JWT authentication
router.use(authenticate);

// Start a new mock interview session
router.post(
  '/sessions',
  body('roleTitle')
    .isString()
    .notEmpty()
    .withMessage('Role title is required'),
  body('jobDescription')
    .optional()
    .isString(),
  body('questionCount')
    .optional()
    .isInt({ min: 1, max: 15 })
    .withMessage('Question count must be a positive integer between 1 and 15')
    .toInt(),
  validate,
  InterviewController.startSession
);

// Fetch readiness dashboard score & progression history logs
router.get(
  '/readiness',
  InterviewController.getReadiness
);

// List all mock interview sessions
router.get(
  '/sessions',
  InterviewController.listSessions
);

// Fetch session details, questions, and responses
router.get(
  '/sessions/:id',
  param('id')
    .isUUID()
    .withMessage('Invalid session ID'),
  validate,
  InterviewController.getSession
);

// Submit student response for a specific question
router.post(
  '/sessions/:id/submit',
  param('id')
    .isUUID()
    .withMessage('Invalid session ID'),
  body('questionId')
    .isUUID()
    .withMessage('Invalid question ID'),
  body('responseText')
    .isString()
    .notEmpty()
    .withMessage('Response text is required and cannot be empty'),
  validate,
  InterviewController.submitResponse
);

// Complete interview session, triggering score aggregation & readiness update
router.post(
  '/sessions/:id/complete',
  param('id')
    .isUUID()
    .withMessage('Invalid session ID'),
  validate,
  InterviewController.completeSession
);

// Fetch compiled evaluation PDF report for a session
router.get(
  '/sessions/:id/report',
  param('id')
    .isUUID()
    .withMessage('Invalid session ID'),
  validate,
  InterviewController.getReport
);

export default router;
