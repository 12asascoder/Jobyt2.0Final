import { api } from '../lib/api';
import { Platform } from 'react-native';

export const notificationService = {
  async registerDeviceToken(token: string) {
    return api.post('/me/device-tokens', {
      token,
      platform: Platform.OS,
    });
  },

  async removeDeviceToken(token: string) {
    return api.delete('/me/device-tokens', { data: { token } });
  },
};
export default notificationService;
