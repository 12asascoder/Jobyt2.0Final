import { Request, Response, NextFunction } from 'express';
import { MessageService } from '../services/message.service';
import { sendSuccess } from '../utils/response';
import { BadRequestError, ForbiddenError } from '../utils/errors';

export const MessageController = {
  async getConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const conversations = await MessageService.getConversations(req.user!.userId);
      sendSuccess(res, conversations);
    } catch (err) {
      next(err);
    }
  },

  async startConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicantId, recipientId, jobId } = req.body as {
        applicantId?: string;
        recipientId?: string;
        jobId?: string;
      };
      const requester = req.user!;

      // Only recruiters can initiate conversations
      if (requester.role !== 'recruiter') {
        throw new ForbiddenError('Only recruiters can initiate conversations');
      }

      const targetApplicantId = applicantId || recipientId;
      if (!targetApplicantId) {
        throw new BadRequestError('recipientId or applicantId is required', 'RECIPIENT_REQUIRED');
      }
      if (targetApplicantId === requester.userId) {
        throw new BadRequestError('You cannot message yourself', 'SELF_MESSAGE_NOT_ALLOWED');
      }

      const recruiterId = requester.userId;
      const finalApplicantId = targetApplicantId;

      const conversation = await MessageService.getOrCreateConversation(
        recruiterId,
        finalApplicantId,
        jobId,
      );
      sendSuccess(res, conversation, 'Conversation started', 201);
    } catch (err) {
      next(err);
    }
  },

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const messages = await MessageService.getMessages(
        req.params.conversationId as string,
        req.user!.userId,
        page,
        50,
      );
      sendSuccess(res, { messages });
    } catch (err) {
      next(err);
    }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { body, content } = req.body as { body?: string; content?: string };
      const messageBody = typeof content === 'string' ? content : body;
      const message = await MessageService.sendMessage(
        req.params.conversationId as string,
        req.user!.userId,
        messageBody || '',
      );
      sendSuccess(res, { message }, 'Message sent', 201);
    } catch (err) {
      next(err);
    }
  },
};
