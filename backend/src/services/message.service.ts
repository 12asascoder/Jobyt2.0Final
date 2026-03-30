import { MessageModel } from '../models/message.model';
import { NotificationModel } from '../models/notification.model';
import { emitMessage, emitNotification } from '../config/socket';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';

export const MessageService = {
  async getConversations(userId: string) {
    return MessageModel.getConversationsForUser(userId);
  },

  async getOrCreateConversation(recruiterId: string, applicantId: string, jobId?: string) {
    return MessageModel.findOrCreateConversation(recruiterId, applicantId, jobId);
  },

  async getConversationForUser(conversationId: string, userId: string) {
    const conversation = await MessageModel.getConversationById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const isParticipant =
      conversation.recruiter_id === userId || conversation.applicant_id === userId;

    if (!isParticipant) {
      throw new ForbiddenError('You are not part of this conversation', 'NOT_CONVERSATION_MEMBER');
    }

    return conversation;
  },

  async getMessages(conversationId: string, userId: string, page: number, limit: number) {
    await MessageService.getConversationForUser(conversationId, userId);
    return MessageModel.getMessages(conversationId, page, limit);
  },

  async sendMessage(conversationId: string, senderId: string, content: string) {
    const conversation = await MessageService.getConversationForUser(conversationId, senderId);
    const body = String(content || '').trim();

    if (!body) {
      throw new BadRequestError('Message content is required', 'MESSAGE_REQUIRED');
    }

    const recipientId =
      senderId === conversation.recruiter_id
        ? conversation.applicant_id
        : conversation.recruiter_id;

    const message = await MessageModel.createMessage({
      conversation_id: conversationId,
      sender_id: senderId,
      body,
    });

    // Real-time delivery to conversation room
    emitMessage(conversationId, message);

    // Persist + real-time notification for recipient
    const notification = await NotificationModel.create({
      user_id: recipientId,
      type: 'new_message',
      title: 'New message',
      body: body.length > 60 ? body.substring(0, 60) + '…' : body,
      action_url: `/messages/${conversationId}`,
    });
    emitNotification(recipientId, notification);

    return message;
  },
};
