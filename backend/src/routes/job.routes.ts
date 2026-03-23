import { Router } from 'express';
import { body } from 'express-validator';
import { JobController } from '../controllers/job.controller';
import { authenticate, authorize } from '../middleware/auth';
import { requireCredits } from '../middleware/credit.middleware';
import { validate } from '../middleware/validate';
import { CREDIT_COSTS } from '../config/creditCosts';

const router = Router();

// Public
router.get('/', JobController.search);
router.get('/:id', JobController.getById);

// Recruiter
router.use(authenticate, authorize('recruiter', 'admin'));

router.get('/my/listings', JobController.myJobs);

router.post(
  '/',
  requireCredits(CREDIT_COSTS.POST_JOB),
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

router.patch('/:id/publish', requireCredits(CREDIT_COSTS.POST_JOB), JobController.publish);
router.delete('/:id', JobController.delete);

export default router;
