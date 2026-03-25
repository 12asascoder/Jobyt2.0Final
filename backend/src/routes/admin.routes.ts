import { Router } from 'express';
import { body } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';
import { JobController } from '../controllers/job.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate, authorize('admin'));

// ── Users ───────────────────────────────────────────────────────────────────────
router.get('/users', AdminController.listUsers);
router.get('/users/:id', AdminController.getUserById);

router.patch(
  '/users/:id/ban',
  body('reason').notEmpty().withMessage('Ban reason is required'),
  validate,
  AdminController.banUser,
);

router.patch('/users/:id/unban', AdminController.unbanUser);

router.delete(
  '/users/:id',
  body('reason').notEmpty().withMessage('Delete reason is required'),
  validate,
  AdminController.deleteUser,
);

// ── Jobs ─────────────────────────────────────────────────────────────────────────
router.get('/jobs', AdminController.listJobs);

router.patch('/jobs/:id/close', body('reason').notEmpty(), validate, AdminController.closeJob);

router.patch('/jobs/:id/approve', JobController.approveJob);

router.delete('/jobs/:id', body('reason').notEmpty(), validate, AdminController.deleteJob);

// ── Credits ───────────────────────────────────────────────────────────────────────
router.get('/credits', AdminController.getAllTransactions);

router.post(
  '/credits/:id/adjust',
  body('amount')
    .isInt()
    .withMessage('Amount must be an integer (positive to add, negative to deduct)'),
  body('reason').notEmpty().withMessage('Reason is required'),
  validate,
  AdminController.adjustCredits,
);

// ── Recruiter Verification ─────────────────────────────────────────────────────
router.patch(
  '/recruiter/:id/verify',
  body('is_verified')
    .exists()
    .withMessage('is_verified is required')
    .isBoolean({ strict: true })
    .withMessage('is_verified must be a strict boolean')
    .toBoolean(),
  validate,
  AdminController.verifyRecruiter,
);

// ── Metrics & Audit ────────────────────────────────────────────────────────────────
router.get('/metrics', AdminController.getMetrics);
router.get('/audit-log', AdminController.getAuditLog);

export default router;
