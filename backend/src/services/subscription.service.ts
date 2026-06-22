import prisma from '../config/prisma';

export interface SubscriptionTierData {
  name: string;
  targetAudience: 'STUDENT' | 'EMPLOYER';
  priceMonthly: number;
  priceAnnual: number;
  features: Record<string, any>;
}

export const SubscriptionService = {
  /**
   * Retrieve all active subscription tiers
   */
  async getActiveTiers(targetAudience?: 'STUDENT' | 'EMPLOYER') {
    return prisma.subscription_tiers.findMany({
      where: {
        is_active: true,
        ...(targetAudience && { target_audience: targetAudience })
      }
    });
  },

  /**
   * Assign a tier to a user (creating or updating their subscription)
   */
  async subscribeUser(userId: string, tierName: string, billingCycle: 'monthly' | 'annual' = 'monthly') {
    const tier = await prisma.subscription_tiers.findUnique({ where: { name: tierName } });
    if (!tier) throw new Error(`Tier ${tierName} not found`);

    const periodEnd = new Date();
    if (billingCycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    return prisma.subscriptions.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        tier_id: tier.id,
        billing_cycle: billingCycle,
        status: 'active',
        current_period_start: new Date(),
        current_period_end: periodEnd,
        cancel_at_period_end: false
      },
      update: {
        tier_id: tier.id,
        billing_cycle: billingCycle,
        status: 'active',
        current_period_start: new Date(),
        current_period_end: periodEnd,
        cancel_at_period_end: false
      }
    });
  },

  /**
   * Check if a user has access to a specific feature based on their tier.
   * Features JSON might look like: { "maxJobs": 5, "aiCreditsPerMonth": 100 }
   */
  async checkFeatureLimit(userId: string, featureKey: string): Promise<any> {
    const sub = await prisma.subscriptions.findUnique({
      where: { user_id: userId },
      include: { tier: true }
    });

    if (!sub || sub.status !== 'active') {
      // Fallback to FREE tier if it exists
      const freeTier = await prisma.subscription_tiers.findFirst({
        where: { name: 'FREE', is_active: true }
      });
      if (!freeTier) return null;
      
      const features = freeTier.features as Record<string, any>;
      return features[featureKey] ?? null;
    }

    const features = sub.tier.features as Record<string, any>;
    return features[featureKey] ?? null;
  }
};
