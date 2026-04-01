import nodemailer from 'nodemailer';

// Email utility — SMTP integration

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (process.env.NODE_ENV === 'test') return;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;
  const connectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || '30000');
  const greetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT_MS || '15000');

  if (!host || !user || !pass || !from) {
    console.log(`\n📧 [DEV EMAIL] ─────────────────────────────────`);
    console.log(`   To:      ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    const links = options.html.match(/href="([^"]+)"/g);
    if (links) links.forEach((l) => console.log(`   Link:    ${l.replace(/href="|"/g, '')}`));
    console.log(`   Note:    SMTP env vars missing, email not sent.`);
    console.log(`────────────────────────────────────────────────\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    connectionTimeout,
    greetingTimeout,
    auth: {
      user,
      pass,
    },
  });

  try {
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (err) {
    console.error('\n📧 [SMTP ERROR] Email delivery failed');
    console.error(err);
    return;
  }

  console.log(`\n📧 [DEV EMAIL] ─────────────────────────────────`);
  console.log(`   To:      ${options.to}`);
  console.log(`   Subject: ${options.subject}`);
  // Extract any href links from html so the dev can click them
  const links = options.html.match(/href="([^"]+)"/g);
  if (links) links.forEach((l) => console.log(`   Link:    ${l.replace(/href="|"/g, '')}`));
  console.log(`────────────────────────────────────────────────\n`);
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

export const oauthEmailVerificationHtml = (email: string, token: string): string => `
  <h2>Verify your email address</h2>
  <p>Hi ${email}, please verify your email to continue using protected features.</p>
  <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}">Verify Email</a>
  <p>This link expires in 15 minutes.</p>
`;
