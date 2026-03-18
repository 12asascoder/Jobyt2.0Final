import { Router } from 'express';
import { body } from 'express-validator';
import { ApplicationController } from '../controllers/application.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

// Applicant: view own applications
router.get('/my', authorize('applicant'), ApplicationController.myApplications);

// Applicant: view applications with filters (status, jobTitle)
router.get('/my/filtered', authorize('applicant'), ApplicationController.myApplicationsFiltered);

// Applicant: get application statistics
router.get('/my/stats', authorize('applicant'), ApplicationController.getApplicationStats);

// Recruiter: view all applicants across all jobs
router.get('/recruiter/applicants', authorize('recruiter', 'admin'), ApplicationController.recruiterApplications);

// Recruiter: view all applicants with filters (status, jobTitle, applicantName)
router.get('/recruiter/applicants/filtered', authorize('recruiter', 'admin'), ApplicationController.recruiterApplicationsFiltered);

// Recruiter: get statistics for all applications
router.get('/recruiter/applicants/stats', authorize('recruiter', 'admin'), ApplicationController.recruiterApplicationsStats);

// Applicant: check if applied to a job
router.get('/jobs/:jobId/check', authorize('applicant'), ApplicationController.checkApplication);

// Applicant: apply to a job
router.post(
  '/jobs/:jobId',
  authorize('applicant'),
  body('cover_letter').optional().isString(),
  validate,
  ApplicationController.apply,
);

// Recruiter: view applications for a job
router.get('/jobs/:jobId', authorize('recruiter', 'admin'), ApplicationController.jobApplications);

// Recruiter: update application status
router.patch(
  '/:id/status',
  authorize('recruiter', 'admin'),
  body('status').isIn([
    'APPLIED',
    'SCREENING',
    'SHORTLISTED',
    'INTERVIEW',
    'SELECTED',
    'HIRED',
    'REJECTED',
  ]),
  validate,
  ApplicationController.updateStatus,
);

// Any role: get pipeline events for an application
router.get(
  '/:id/events',
  authorize('applicant', 'recruiter', 'admin'),
  ApplicationController.getEvents,
);

export default router;
