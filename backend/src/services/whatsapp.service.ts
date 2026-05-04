import axios from 'axios';
import { AppError } from '../utils/appError';

export const WhatsAppService = {
  /**
   * Sends an OTP via the Meta WhatsApp Cloud API.
   * Requires WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in the environment.
   */
  async sendOtp(phone: string, code: string): Promise<void> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Sanitize phone number (remove any non-numeric chars)
    const sanitizedPhone = phone.replace(/\D/g, '');

    if (!accessToken || !phoneNumberId) {
      console.warn(`[DEV WHATSAPP] Mock sending OTP ${code} to ${sanitizedPhone}`);
      console.warn(`[DEV WHATSAPP] Please configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env to enable actual sending.`);
      return;
    }

    try {
      const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: sanitizedPhone,
        type: 'template',
        template: {
          // You must pre-approve this template name in your Meta Business account
          name: 'verification_code', 
          language: {
            code: 'en_US'
          },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: code
                }
              ]
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [
                {
                  type: 'text',
                  text: code
                }
              ]
            }
          ]
        }
      };

      await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10s timeout to prevent hanging requests
      });

    } catch (error) {
      console.error('WhatsApp API Error:', error);
      throw new AppError('Failed to send WhatsApp message', 502);
    }
  }
};
