import { PaymentModel } from '../models/payment.model';
import { CreditService } from './credit.service';
import { NotificationModel } from '../models/notification.model';

export const PaymentService = {
  async getPlans() {
    return PaymentModel.getActivePlans();
  },

  async initiateCheckout(userId: string, planId: string) {
    const plan = await PaymentModel.findPlanById(planId);
    if (!plan) throw Object.assign(new Error('Plan not found'), { statusCode: 404 });

    const payment = await PaymentModel.createPayment({
      user_id: userId,
      plan_id: planId,
      amount: plan.price,
      currency: plan.currency,
    });

    // TODO: create Stripe/Razorpay checkout session here and return URL
    // const session = await stripe.checkout.sessions.create({ ... });
    // await PaymentModel.updateStatus(payment.id, 'pending', session.id);
    // return { checkoutUrl: session.url, paymentId: payment.id };

    return { paymentId: payment.id, plan };
  },

  // Called by Stripe/Razorpay webhook
  async handleWebhookSuccess(gatewayRef: string) {
    const payment = await PaymentModel.findByGatewayRef(gatewayRef);
    if (!payment || payment.status === 'success') return;

    await PaymentModel.updateStatus(payment.id, 'success');
    const plan = payment.plan_id ? await PaymentModel.findPlanById(payment.plan_id) : null;
    if (plan) {
      await CreditService.grantPlanCredits(payment.user_id, plan.credits, payment.id);
      await NotificationModel.create({
        user_id: payment.user_id,
        type: 'payment_success',
        title: 'Payment successful',
        body: `${plan.credits} credits have been added to your account.`,
        action_url: '/credits',
      });
    }
  },

  async handleWebhookFailure(gatewayRef: string) {
    const payment = await PaymentModel.findByGatewayRef(gatewayRef);
    if (!payment) return;
    await PaymentModel.updateStatus(payment.id, 'failed');
    await NotificationModel.create({
      user_id: payment.user_id,
      type: 'payment_failed',
      title: 'Payment failed',
      body: 'Your payment could not be processed. Please try again.',
      action_url: '/credits',
    });
  },

  async getHistory(userId: string, page: number, limit: number) {
    return PaymentModel.getHistory(userId, page, limit);
  },
};
