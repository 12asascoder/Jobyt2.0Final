import { Router } from 'express';
import { body } from 'express-validator';
import { ApplicationController } from '../controllers/application.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

// Applicant: view own applications
router.get('/my', authorize('applicant'), ApplicationController.myApplications);

// Applicant: apply to a job
router.post('/jobs/:jobId',
  authorize('applicant'),
  body('cover_letter').optional().isString(),
  validate,
  ApplicationController.apply
);

// Recruiter: view applications for a job
router.get('/jobs/:jobId', authorize('recruiter', 'admin'), ApplicationController.jobApplications);

// Recruiter: update application status
router.patch('/:id/status',
  authorize('recruiter', 'admin'),
  body('status').isIn(['applied', 'in_review', 'shortlisted', 'interview', 'offer', 'hired', 'rejected']),
  validate,
  ApplicationController.updateStatus
);

export default router;
