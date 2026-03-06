import { Router } from 'express';
import authRoutes from './auth.routes';
import jobRoutes from './job.routes';
import applicationRoutes from './application.routes';
import creditRoutes from './credit.routes';
import notificationRoutes from './notification.routes';
import messageRoutes from './message.routes';
import paymentRoutes from './payment.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/credits', creditRoutes);
router.use('/notifications', notificationRoutes);
router.use('/messages', messageRoutes);
router.use('/payments', paymentRoutes);

export default router;
