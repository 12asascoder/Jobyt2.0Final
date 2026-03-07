import { Router } from 'express';
import { body } from 'express-validator';
import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';
import { uploadResume, uploadImage } from '../middleware/upload';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

// ── Own profile ────────────────────────────────────────────────────────────────
router.get('/me', UserController.getMyProfile);

router.put('/me',
  body('name').optional().isString().trim(),
  body('phone').optional().isMobilePhone('any'),
  body('bio').optional().isString(),
  body('skills').optional().isArray(),
  body('experience').optional().isArray(),
  body('education').optional().isArray(),
  body('company_name').optional().isString().trim(),
  body('industry').optional().isString(),
  body('website').optional().isURL(),
  validate,
  UserController.updateProfile
);

// ── File uploads ───────────────────────────────────────────────────────────────
router.post('/me/resume',
  authorize('applicant'),
  uploadResume.single('resume'),
  UserController.uploadResume
);

router.post('/me/photo',
  uploadImage.single('photo'),
  UserController.uploadPhoto
);

// ── Saved Jobs (applicant only) ───────────────────────────────────────────────
router.get('/me/saved-jobs', authorize('applicant'), UserController.getSavedJobs);
router.post('/me/saved-jobs/:jobId', authorize('applicant'), UserController.saveJob);
router.delete('/me/saved-jobs/:jobId', authorize('applicant'), UserController.unsaveJob);

// ── Public profile ─────────────────────────────────────────────────────────────
router.get('/:userId', UserController.getPublicProfile);

export default router;
