import { Router } from 'express';
import { CreditController } from '../controllers/credit.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/balance', CreditController.getBalance);
router.get('/ledger', CreditController.getLedger);
router.get('/history', CreditController.getLedger);

export default router;
