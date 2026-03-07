import { UserModel } from '../models/user.model';
import { ReferralModel } from '../models/referral.model';
import { AppError } from '../utils/appError';

export const ReferralService = {
  async getDashboard(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const referrals = await ReferralModel.findByReferrerId(userId);

    const totalCreditsEarned = referrals
      .filter((r) => r.referrer_credited)
      .length * 50; // 50 credits per successful referral (matches credit.service)

    const referralLink = `${process.env.FRONTEND_URL}/register?ref=${user.referral_code}`;

    return {
      referral_code: user.referral_code,
      referral_link: referralLink,
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
};
