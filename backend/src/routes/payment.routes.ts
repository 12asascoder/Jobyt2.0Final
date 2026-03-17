import { Router } from 'express';
import { body } from 'express-validator';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/plans', PaymentController.getPlans);

// Webhook — raw body needed for signature verification
router.post('/webhook/stripe', PaymentController.stripeWebhook);

router.use(authenticate);
router.post('/checkout', body('planId').isUUID(), validate, PaymentController.initiateCheckout);
router.get('/history', PaymentController.getHistory);

export default router;
