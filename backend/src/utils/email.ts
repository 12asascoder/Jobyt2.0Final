// Email utility — SendGrid integration (stub, to be wired with SENDGRID_API_KEY)

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (process.env.NODE_ENV === 'test') return;

  // TODO: replace stub with SendGrid SDK call
  // import sgMail from '@sendgrid/mail';
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  // await sgMail.send({ from: process.env.EMAIL_FROM!, ...options });

  console.log(`[Email] To: ${options.to} | Subject: ${options.subject}`);
};

export const verificationEmailHtml = (name: string, token: string): string => `
  <h2>Welcome to Hiring Platform, ${name}!</h2>
  <p>Please verify your email by clicking the link below:</p>
  <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}">Verify Email</a>
  <p>This link expires in 24 hours.</p>
`;

export const passwordResetEmailHtml = (name: string, token: string): string => `
  <h2>Password Reset Request</h2>
  <p>Hi ${name}, click below to reset your password:</p>
  <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Reset Password</a>
  <p>This link expires in 1 hour. Ignore this email if you didn't request a reset.</p>
`;
