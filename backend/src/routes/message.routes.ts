import { Router } from 'express';
import { body } from 'express-validator';
import { MessageController } from '../controllers/message.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/conversations', MessageController.getConversations);

router.post(
  '/conversations',
  authorize('recruiter'),
  body('applicantId').isUUID(),
  body('jobId').optional().isUUID(),
  validate,
  MessageController.startConversation,
);

router.get('/conversations/:conversationId', MessageController.getMessages);

router.post(
  '/conversations/:conversationId',
  body('body').notEmpty(),
  body('recipientId').isUUID(),
  validate,
  MessageController.sendMessage,
);

export default router;
