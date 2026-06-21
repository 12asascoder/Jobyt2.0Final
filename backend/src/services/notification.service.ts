import { NotificationModel, NotificationType } from '../models/notification.model';
import { emitNotification } from '../config/socket';
import pool from '../config/database';
import { PushNotificationService } from './push.service';

export const NotificationService = {
  async getNotifications(userId: string, page: number, limit: number) {
    return NotificationModel.findByUser(userId, page, limit);
  },

  async markRead(userId: string, notificationId: string) {
    await NotificationModel.markRead(notificationId, userId);
  },

  async markAllRead(userId: string) {
    await NotificationModel.markAllRead(userId);
  },

  async send(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    actionUrl?: string,
  ) {
    const notification = await NotificationModel.create({
      user_id: userId,
      type,
      title,
      body,
      action_url: actionUrl,
    });
    
    // Check push notifications preferences and trigger push
    try {
      const { rows } = await pool.query('SELECT push_alerts_enabled FROM users WHERE id = $1', [userId]);
      if (rows.length > 0 && rows[0].push_alerts_enabled) {
        PushNotificationService.sendPushNotification(userId, title, body, actionUrl).catch((err) => {
          console.error('[NotificationService] Failed to send push:', err);
        });
      }
    } catch (err) {
      console.error('[NotificationService] Failed to fetch user push preferences:', err);
    }

    emitNotification(userId, notification);
    return notification;
  },
};
