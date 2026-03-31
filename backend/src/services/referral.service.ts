import { UserModel } from '../models/user.model';
import { ReferralModel } from '../models/referral.model';
import { ReferralRedemptionModel } from '../models/referralRedemption.model';
import { AppError } from '../utils/appError';
import { CreditService } from './credit.service';

export const ReferralService = {
  async getDashboard(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const referrals = await ReferralModel.findByReferrerId(userId);

    const totalCreditsEarned = referrals.filter((r) => r.referrer_credited).length * 50; // 50 credits per successful referral (matches credit.service)

    const referralLink = `${process.env.FRONTEND_URL}/register?ref=${user.referral_code}`;

    return {
      code: user.referral_code,
      link: referralLink,
      total_referrals: referrals.length,
      successful_referrals: referrals.filter((r) => r.referrer_credited).length,
      pending_referrals: referrals.filter((r) => !r.referrer_credited).length,
      total_credits_earned: totalCreditsEarned,
      referrals: referrals.map((r) => ({
        id: r.id,
        email: (r as unknown as Record<string, string>).email,
        name: (r as unknown as Record<string, string>).name,
        joined_at: r.created_at,
        credited: r.referrer_credited,
      })),
    };
  },

  async redeemCode(userId: string, referralCode: string) {
    // Check if user already redeemed a code
    const existingRedemption = await ReferralRedemptionModel.findByUserId(userId);
    if (existingRedemption) {
      throw new AppError('You have already redeemed a referral code', 400);
    }

    // Find the referrer with this code
    const referrer = await UserModel.findByReferralCode(referralCode);
    if (!referrer) {
      throw new AppError('Invalid referral code', 404);
    }

    // Prevent self-referral
    if (referrer.id === userId) {
      throw new AppError('You cannot redeem your own referral code', 400);
    }

    // Create redemption record
    await ReferralRedemptionModel.create(userId, referrer.id);

    // Grant credits to both users
    await CreditService.grantCommunityReferralRewards(referrer.id, userId);

    return {
      message: 'Referral code redeemed successfully!',
      credits_earned: 10,
      referrer_name: referrer.email,
    };
  },

  async getRedemptionStatus(userId: string) {
    const redemption = await ReferralRedemptionModel.findByUserId(userId);
    return {
      has_redeemed: !!redemption,
      redeemed_at: redemption?.created_at || null,
    };
  },
};
