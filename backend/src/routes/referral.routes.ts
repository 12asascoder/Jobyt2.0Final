import { Router } from 'express';
import { ReferralController } from '../controllers/referral.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/dashboard', ReferralController.getDashboard);

export default router;
