import { Router } from 'express';
import { AutoApplyController } from '../controllers/autoApply.controller';
import { authenticate, authorize } from '../middleware/auth';
import { requireEmail } from '../middleware/requireEmail';

const router = Router();

// Secure all auto-apply routes to authenticated applicants
router.use(authenticate, requireEmail, authorize('applicant'));

router.get('/dashboard', AutoApplyController.getDashboard);
router.put('/preferences', AutoApplyController.updatePreferences);
router.post('/apply/:logId', AutoApplyController.applyQueueItem);
router.post('/apply-all', AutoApplyController.triggerAutoApply);
router.delete('/queue/:logId', AutoApplyController.removeQueueItem);

export default router;
