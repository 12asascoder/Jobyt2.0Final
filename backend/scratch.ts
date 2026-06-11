import { OAuth2Client } from 'google-auth-library';

try {
  const client = new OAuth2Client();
  console.log('OAuth2Client initialized successfully');
} catch (e) {
  console.error('Failed to initialize OAuth2Client', e);
}
