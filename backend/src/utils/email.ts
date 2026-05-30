import nodemailer from 'nodemailer';

// Email utility — SMTP integration

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

let testAccountPromise: Promise<nodemailer.TestAccount> | null = null;

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (process.env.NODE_ENV === 'test') return;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || '"Hiring Platform" <noreply@hiringplatform.local>';
  const connectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || '30000');
  const greetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT_MS || '15000');
  const fallbackEnabled = process.env.SMTP_FALLBACK_ENABLED !== 'false';

  if (!host || !user || !pass) {
    console.log(`\n📧 [DEV EMAIL] SMTP config missing. Falling back to Ethereal Email.`);
    try {
      if (!testAccountPromise) {
        testAccountPromise = nodemailer.createTestAccount();
      }
      const testAccount = await testAccountPromise;

      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log(`\n📧 [DEV EMAIL] ─────────────────────────────────`);
      console.log(`   To:      ${options.to}`);
      console.log(`   Subject: ${options.subject}`);
      console.log(`   Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      const links = options.html.match(/href="([^"]+)"/g);
      if (links) links.forEach((l) => console.log(`   Link:    ${l.replace(/href="|"/g, '')}`));
      console.log(`────────────────────────────────────────────────\n`);
    } catch (err) {
      console.error('Failed to send Ethereal email:', err);
      // Fallback to console print if ethereal fails
      console.log(`\n📧 [DEV EMAIL] ─────────────────────────────────`);
      console.log(`   To:      ${options.to}`);
      console.log(`   Subject: ${options.subject}`);
      const links = options.html.match(/href="([^"]+)"/g);
      if (links) links.forEach((l) => console.log(`   Link:    ${l.replace(/href="|"/g, '')}`));
      console.log(`   Note:    SMTP env vars missing, email not sent.`);
      console.log(`────────────────────────────────────────────────\n`);
    }
    return;
  }

  const attempts: Array<{ host: string; port: number; secure: boolean }> = [
    { host, port, secure },
  ];

  if (fallbackEnabled) {
    // Common fallback for providers where 465 may be blocked from some hosts.
    if (!(port === 587 && secure === false)) {
      attempts.push({ host, port: 587, secure: false });
    }

    // Zoho DC fallback (in case tenant is on another DC endpoint).
    if (host === 'smtp.zoho.in') {
      attempts.push({ host: 'smtp.zoho.com', port: 587, secure: false });
    } else if (host === 'smtp.zoho.com') {
      attempts.push({ host: 'smtp.zoho.in', port: 587, secure: false });
    }
  }

  let lastError: unknown = null;

  for (const attempt of attempts) {
    const transporter = nodemailer.createTransport({
      host: attempt.host,
      port: attempt.port,
      secure: attempt.secure,
      connectionTimeout,
      greetingTimeout,
      auth: {
        user,
        pass,
      },
      tls: {
        servername: attempt.host,
        minVersion: 'TLSv1.2',
      },
    });

    try {
      await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      const code = (err as { code?: string }).code || 'UNKNOWN';
      console.error(
        `\n📧 [SMTP ERROR] attempt failed host=${attempt.host} port=${attempt.port} secure=${attempt.secure} code=${code}`,
      );
    }
  }

  if (lastError) {
    console.error('\n📧 [SMTP ERROR] Email delivery failed after all attempts');
    console.error(lastError);
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

export const otpEmailHtml = (code: string, expiryMins: number = 5): string => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #333;">Your Verification Code</h2>
    <p>Please use the following One-Time Password (OTP) to verify your account:</p>
    <div style="background-color: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 4px; margin: 20px 0;">
      ${code}
    </div>
    <p style="color: #666; font-size: 14px;">This code will expire in ${expiryMins} minutes. If you did not request this, please ignore this email.</p>
  </div>
`;

export const dailyRecommendationEmailHtml = (name: string, jobs: any[]): string => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #333;">Daily Job Recommendations</h2>
    <p>Hi ${name},</p>
    <p>Here are some top job matches for you based on your profile:</p>
    ${jobs.map(job => `
      <div style="background-color: #f9f9f9; padding: 15px; margin-bottom: 15px; border-radius: 6px; border-left: 4px solid #0056b3;">
        <h3 style="margin: 0 0 5px 0; color: #0056b3;">${job.title}</h3>
        <p style="margin: 0 0 5px 0; color: #555;"><strong>${job.companyName || 'Unknown Company'}</strong> - ${job.location || 'Remote/Anywhere'}</p>
        <p style="margin: 0 0 10px 0; color: #777; font-size: 14px;">Match Score: ${job.score}%</p>
        <a href="${process.env.FRONTEND_URL}/jobs/${job.id}" style="display: inline-block; background-color: #0056b3; color: #fff; text-decoration: none; padding: 8px 12px; border-radius: 4px; font-size: 14px;">View Job</a>
      </div>
    `).join('')}
    <p style="color: #666; font-size: 12px; margin-top: 20px;">You are receiving this because you have Email Alerts enabled. You can manage your preferences in your account settings.</p>
  </div>
`;

