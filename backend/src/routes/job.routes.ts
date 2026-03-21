import { Router } from 'express';
import { body } from 'express-validator';
import { JobController } from '../controllers/job.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { employerGuard } from '../middleware/employerGuard';
import { validate } from '../middleware/validate';

const router = Router();

// Public
router.get('/', JobController.getJobs);
router.get('/:id', optionalAuth, JobController.getJobById);

// Close endpoint: bypass employerGuard since service validates ownership
// Uses: authenticate + authorize('recruiter')
router.patch('/:id/close', authenticate, authorize('recruiter'), JobController.closeJob);

// Recruiter-only management routes (with profile check).
// Order is important:
// 1) authenticate: token must be valid
// 2) authorize('recruiter'): role must be recruiter
// 3) employerGuard: recruiter profile must exist in DB
router.use(authenticate, authorize('recruiter'), employerGuard);

router.get('/my/listings', JobController.myJobs);

router.post(
  '/',
  body('title').notEmpty().trim(),
  body('description').notEmpty(),
  body('location').optional().isString().trim(),
  body('salary_min').optional().isInt({ min: 0 }),
  body('salary_max')
    .optional()
    .isInt({ min: 0 })
    .custom((value, { req }) => {
      if (req.body.salary_min !== undefined && Number(value) < Number(req.body.salary_min)) {
        throw new Error('salary_max must be greater than or equal to salary_min');
      }
      return true;
    }),
  body('type').optional().isIn(['full-time', 'part-time', 'contract', 'remote', 'internship']),
  body('skills').optional().isArray().withMessage('skills must be an array'),
  body('skills.*').optional().isString().withMessage('Each skill must be a string'),
  validate,
  JobController.createJob,
);

router.put(
  '/:id',
  body('title').optional().notEmpty().trim(),
  body('description').optional().notEmpty(),
  body('location').optional().isString().trim(),
  body('salary_min').optional().isInt({ min: 0 }).toInt(),
  body('salary_max')
    .optional()
    .isInt({ min: 0 })
    .toInt()
    .custom((value, { req }) => {
      if (req.body.salary_min !== undefined && Number(value) < Number(req.body.salary_min)) {
        throw new Error('salary_max must be greater than or equal to salary_min');
      }
      return true;
    }),
  body('type')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['full-time', 'part-time', 'contract', 'remote', 'internship']),
  body('skills')
    .optional()
    .isArray()
    .withMessage('skills must be an array')
    .bail()
    .custom((skills) =>
      Array.isArray(skills) &&
      skills.every((skill) => typeof skill === 'string' && skill.trim().length > 0),
    )
    .withMessage('skills must contain non-empty strings only')
    .customSanitizer((skills) => skills.map((skill: string) => skill.trim())),
  validate,
  JobController.updateJob,
);

router.patch('/:id/publish', JobController.publish);
router.delete('/:id', JobController.delete);

export default router;
