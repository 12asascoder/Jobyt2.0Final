import { Router } from 'express';
import { body } from 'express-validator';
import { UserController } from '../controllers/user.controller';
import { ResumeController } from '../controllers/resume.controller';
import * as RoadmapProgressController from '../controllers/roadmapProgress.controller';
import { authenticate, authorize } from '../middleware/auth';
import { uploadResume, uploadImage } from '../middleware/upload';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

// ── Own profile ────────────────────────────────────────────────────────────────
router.get('/me', UserController.getMyProfile);

router.put(
  '/me',
  body('name').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('phone').optional({ nullable: true, checkFalsy: true }).isMobilePhone('any'),
  body('bio').optional({ nullable: true }).isString(),
  body('skills').optional().isArray(),
  body('experience').optional().isArray(),
  body('education').optional().isArray(),
  body('companyName').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('industry').optional({ nullable: true, checkFalsy: true }).isString(),
  body('website').optional({ nullable: true, checkFalsy: true }).isURL(),
  body('portfolio_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ require_protocol: false })
    .withMessage('Portfolio URL is not a valid URL'),
  body('github_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ require_protocol: false })
    .withMessage('GitHub URL is not a valid URL'),
  body('linkedin_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ require_protocol: false })
    .withMessage('LinkedIn URL is not a valid URL')
    .custom((value: string) => {
      if (!value) return true;
      const normalized = value.replace(/^https?:\/\//i, '').toLowerCase();
      if (!normalized.startsWith('linkedin.com/') && !normalized.startsWith('www.linkedin.com/')) {
        throw new Error('LinkedIn URL must be from linkedin.com (e.g. https://linkedin.com/in/username)');
      }
      return true;
    }),
  validate,
  UserController.updateProfile,
);

router.get('/me/preferences', UserController.getPreferences);
router.put(
  '/me/preferences',
  body('email_alerts_enabled').optional().isBoolean(),
  body('whatsapp_alerts_enabled').optional().isBoolean(),
  validate,
  UserController.updatePreferences
);

// ── File uploads ───────────────────────────────────────────────────────────────
router.post(
  '/me/resume',
  authorize('applicant'),
  uploadResume.single('resume'),
  UserController.uploadResume,
);

router.post(
  '/me/resume-parse',
  authorize('applicant'),
  uploadResume.single('resume'),
  UserController.parseResume,
);

router.post('/me/photo', uploadImage.single('photo'), UserController.uploadPhoto);

// ── Resumes (applicant only) ────────────────────────────────────────────────
router.get('/me/resumes', authorize('applicant'), ResumeController.getMyResumes);
router.get(
  '/me/resumes/default',
  authorize('applicant'),
  ResumeController.getDefaultResume,
);
router.get('/me/resumes/:id', authorize('applicant'), ResumeController.getById);
router.patch(
  '/me/resumes/:id/set-default',
  authorize('applicant'),
  ResumeController.setDefault,
);
router.delete('/me/resumes/:id', authorize('applicant'), ResumeController.delete);
router.post(
  '/me/resume-score',
  authorize('applicant'),
  uploadResume.single('file'),
  body('jobDescription').isString(),
  body('resumeText').optional().isString(),
  body('resume_id').optional().isUUID(),
  validate,
  ResumeController.scoreATS
);

// ── Saved Jobs (applicant only) ───────────────────────────────────────────────
router.get('/me/saved-jobs', authorize('applicant'), UserController.getSavedJobs);
router.post('/me/saved-jobs/:jobId', authorize('applicant'), UserController.saveJob);
router.delete('/me/saved-jobs/:jobId', authorize('applicant'), UserController.unsaveJob);

// ── Roadmap Progress & Recommendations ────────────────────────────────────────
router.get('/:userId/roadmaps/:roadmapId/progress', RoadmapProgressController.getUserProgress);
router.get(
  '/:userId/roadmaps/:roadmapId/recommend-next-skill',
  RoadmapProgressController.getRecommendedNextSkill,
);

// ── Public profile ─────────────────────────────────────────────────────────────
router.get('/:userId/resumes/:id/secure-url', ResumeController.getSecureUrl);
router.get('/:userId', UserController.getPublicProfile);

export default router;
