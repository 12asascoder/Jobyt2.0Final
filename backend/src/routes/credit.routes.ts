import { Router } from 'express';
import { CreditController } from '../controllers/credit.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/balance', CreditController.getBalance);
router.get('/history', CreditController.getHistory);

export default router;
