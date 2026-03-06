import { MessageModel } from '../models/message.model';
import { NotificationModel } from '../models/notification.model';

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
    const message = await MessageModel.createMessage({ conversation_id: conversationId, sender_id: senderId, body });

    await NotificationModel.create({
      user_id: recipientId,
      type: 'new_message',
      title: 'New message',
      body: body.length > 60 ? body.substring(0, 60) + '…' : body,
      action_url: `/messages/${conversationId}`,
    });

    return message;
  },
};
