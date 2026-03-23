import { MessageModel } from '../models/message.model';
import { NotificationModel } from '../models/notification.model';
import { emitMessage, emitNotification } from '../config/socket';

export const MessageService = {
  async getConversations(userId: string) {
    return MessageModel.getConversationsForUser(userId);
  },

  async getOrCreateConversation(recruiterId: string, applicantId: string, jobId?: string) {
    return MessageModel.findOrCreateConversation(recruiterId, applicantId, jobId);
  },

  async getMessages(conversationId: string, page: number, limit: number) {
    return MessageModel.getMessages(conversationId, page, limit);
  },

  async sendMessage(conversationId: string, senderId: string, body: string, recipientId: string) {
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
