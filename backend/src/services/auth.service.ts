import { randomBytes } from 'crypto';
import { UserModel } from '../models/user.model';
import { ApplicantProfileModel } from '../models/applicantProfile.model';
import { RecruiterProfileModel } from '../models/recruiterProfile.model';
import { ReferralModel } from '../models/referral.model';
import { CreditService } from './credit.service';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt';
import { sendEmail, verificationEmailHtml, passwordResetEmailHtml } from '../utils/email';
import { generateReferralCode } from '../utils/referralCode';
import { UserRole, JwtPayload } from '../types';

export const AuthService = {
  async register(email: string, password: string, role: UserRole, referralCode?: string) {
    const existing = await UserModel.findByEmail(email);
    if (existing) throw Object.assign(new Error('Email already registered'), { statusCode: 409 });

    const password_hash = await hashPassword(password);
    const verify_token = randomBytes(32).toString('hex');
    const myReferralCode = generateReferralCode();

    const user = await UserModel.create({
      email,
      password_hash,
      role,
      verify_token,
      referral_code: myReferralCode,
    });

    // Create profile stub
    if (role === 'applicant') await ApplicantProfileModel.create(user.id);
    if (role === 'recruiter') await RecruiterProfileModel.create(user.id);

    // Handle referral
    if (referralCode) {
      const referrer = await UserModel.findByReferralCode(referralCode);
      if (referrer && referrer.id !== user.id) {
        await ReferralModel.create(referrer.id, user.id);
      }
    }

    // Send verification email
    await sendEmail({
      to: email,
      subject: 'Verify your Hiring Platform account',
      html: verificationEmailHtml(email, verify_token),
    });

    return { id: user.id, email: user.email, role: user.role };
  },

  async verifyEmail(token: string) {
    const user = await UserModel.findByVerifyToken(token);
    if (!user)
      throw Object.assign(new Error('Invalid or expired verification token'), { statusCode: 400 });

    await UserModel.verify(user.id);

    // Grant registration credits
    await CreditService.grantRegistrationCredits(user.id);

    // Grant referral rewards if applicable
    const referral = await ReferralModel.findByReferredId(user.id);
    if (referral && !referral.referrer_credited) {
      await CreditService.grantReferralRewards(referral.referrer_id, user.id);
      // mark credited (handled inside grantReferralRewards via referral model)
    }

    return { message: 'Email verified successfully' };
  },

  async login(email: string, password: string) {
    const user = await UserModel.findByEmail(email);
    if (!user) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    if (!user.is_verified)
      throw Object.assign(new Error('Please verify your email first'), { statusCode: 403 });

    if (user.banned_at)
      throw Object.assign(new Error('Your account has been suspended. Please contact support.'), {
        statusCode: 403,
      });

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } };
  },

  async refreshToken(token: string) {
    const payload = verifyToken(token);
    const user = await UserModel.findById(payload.userId);
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 401 });

    const newPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    return { accessToken: signAccessToken(newPayload) };
  },

  async forgotPassword(email: string) {
    const user = await UserModel.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) return;

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await UserModel.setResetToken(user.id, token, expiresAt);

    await sendEmail({
      to: email,
      subject: 'Reset your Hiring Platform password',
      html: passwordResetEmailHtml(email, token),
    });
  },

  async resetPassword(token: string, newPassword: string) {
    const user = await UserModel.findByResetToken(token);
    if (!user)
      throw Object.assign(new Error('Invalid or expired reset token'), { statusCode: 400 });

    const password_hash = await hashPassword(newPassword);
    await UserModel.updatePassword(user.id, password_hash);
  },
};
