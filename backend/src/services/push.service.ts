import axios from 'axios';
import { DeviceTokenModel } from '../models/deviceToken.model';

export const PushNotificationService = {
  async sendPushNotification(userId: string, title: string, body: string, actionUrl?: string) {
    try {
      // Fetch user's registered device tokens
      const tokens = await DeviceTokenModel.findByUser(userId);
      if (tokens.length === 0) {
        return;
      }

      const expoTokens: string[] = [];
      const fcmTokens: string[] = [];

      for (const tokenObj of tokens) {
        const token = tokenObj.token;
        if (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken')) {
          expoTokens.push(token);
        } else {
          fcmTokens.push(token);
        }
      }

      // Send Expo Push Notifications (working end-to-end without credentials)
      if (expoTokens.length > 0) {
        await this.sendExpoPush(expoTokens, title, body, actionUrl);
      }

      // FCM mock dispatch (extensible architecture)
      if (fcmTokens.length > 0) {
        await this.sendFCM(fcmTokens, title, body, actionUrl);
      }
    } catch (err) {
      console.error('[PushNotificationService] Error sending push notification:', err);
    }
  },

  async sendExpoPush(tokens: string[], title: string, body: string, actionUrl?: string) {
    try {
      const messages = tokens.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: { actionUrl },
      }));

      // Expo Push API endpoint
      const response = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      });

      console.log(`[PushNotificationService] Sent Expo push notification to ${tokens.length} devices.`, response.data);
    } catch (err: any) {
      console.error('[PushNotificationService] Failed to send Expo push:', err.response?.data || err.message);
    }
  },

  async sendFCM(tokens: string[], title: string, body: string, actionUrl?: string) {
    // Extensible for future native FCM:
    // When Firebase credentials are provided, we can load firebase-admin and send via multicast.
    // For now, we simulate and log to verify native tokens flow correctly.
    console.log(`[PushNotificationService FCM Mock] Sending push to ${tokens.length} native devices:`, {
      title,
      body,
      actionUrl,
      tokens,
    });
  }
};
export default PushNotificationService;
