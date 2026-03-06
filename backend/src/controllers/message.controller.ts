import { Request, Response, NextFunction } from 'express';
import { MessageService } from '../services/message.service';
import { sendSuccess } from '../utils/response';

export const MessageController = {
  async getConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const conversations = await MessageService.getConversations(req.user!.userId);
      sendSuccess(res, conversations);
    } catch (err) { next(err); }
  },

  async startConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicantId, jobId } = req.body;
      const conversation = await MessageService.getOrCreateConversation(req.user!.userId, applicantId, jobId);
      sendSuccess(res, conversation, 'Conversation started', 201);
    } catch (err) { next(err); }
  },

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const messages = await MessageService.getMessages(req.params.conversationId as string, page, 50);
      sendSuccess(res, messages);
    } catch (err) { next(err); }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { body, recipientId } = req.body;
      const message = await MessageService.sendMessage(req.params.conversationId as string, req.user!.userId, body, recipientId);
      sendSuccess(res, message, 'Message sent', 201);
    } catch (err) { next(err); }
  },
};
