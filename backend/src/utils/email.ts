import emailjs from '@emailjs/nodejs';

// Email utility — EmailJS integration

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (process.env.NODE_ENV === 'test') return;

  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.log(`\n📧 [DEV EMAIL] EmailJS config missing. Email not sent.`);
    console.log(`   To:      ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    const links = options.html.match(/href="([^"]+)"/g);
    if (links) links.forEach((l) => console.log(`   Link:    ${l.replace(/href="|"/g, '')}`));
    return;
  }

  try {
    const templateParams = {
      to_email: options.to,
      subject: options.subject,
      html_content: options.html,
    };

    await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      {
        publicKey: publicKey,
        privateKey: privateKey,
      }
    );

    console.log(`\n📧 [EMAILJS] ─────────────────────────────────`);
    console.log(`   To:      ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    const links = options.html.match(/href="([^"]+)"/g);
    if (links) links.forEach((l) => console.log(`   Link:    ${l.replace(/href="|"/g, '')}`));
    console.log(`────────────────────────────────────────────────\n`);
  } catch (err) {
    console.error('\n📧 [EMAILJS ERROR] Email delivery failed');
    console.error(err);
  }
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

