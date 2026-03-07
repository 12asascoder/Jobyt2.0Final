import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('recruiter', 'admin'));

router.get('/summary', AnalyticsController.getSummary);
router.get('/applications-by-day', AnalyticsController.getApplicationsByDay);
router.get('/time-to-hire', AnalyticsController.getTimeToHire);
router.get('/credit-usage', AnalyticsController.getCreditUsage);
router.get('/jobs/:jobId/funnel', AnalyticsController.getJobFunnel);
router.get('/jobs/:jobId/views', AnalyticsController.getJobViews);

export default router;
