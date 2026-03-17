import { Router } from 'express';
import { body } from 'express-validator';
import { JobController } from '../controllers/job.controller';
import { authenticate, authorize } from '../middleware/auth';
import { employerGuard } from '../middleware/employerGuard';
import { validate } from '../middleware/validate';

const router = Router();

// Public
router.get('/', JobController.search);
router.get('/:id', JobController.getById);

// Recruiter-only management routes.
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
  body('type').isIn(['full-time', 'part-time', 'contract', 'remote', 'internship']),
  body('salary_min').optional().isInt({ min: 0 }),
  body('salary_max').optional().isInt({ min: 0 }),
  validate,
  JobController.create,
);

router.put(
  '/:id',
  body('title').optional().notEmpty().trim(),
  body('type').optional().isIn(['full-time', 'part-time', 'contract', 'remote', 'internship']),
  validate,
  JobController.update,
);

router.patch('/:id/publish', JobController.publish);
router.delete('/:id', JobController.delete);

export default router;
