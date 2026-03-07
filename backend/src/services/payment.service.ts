import Stripe from 'stripe';
import { PaymentModel } from '../models/payment.model';
import { CreditService } from './credit.service';
import { NotificationModel } from '../models/notification.model';
import { AppError } from '../utils/appError';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-02-25.clover',
});

export const PaymentService = {
  async getPlans() {
    return PaymentModel.getActivePlans();
  },

  async initiateCheckout(userId: string, planId: string) {
    const plan = await PaymentModel.findPlanById(planId);
    if (!plan) throw new AppError('Plan not found', 404);

    const payment = await PaymentModel.createPayment({
      user_id: userId,
      plan_id: planId,
      amount: plan.price,
      currency: plan.currency.toLowerCase(),
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: { name: `${plan.name} Plan — ${plan.credits} Credits` },
            unit_amount: Math.round(plan.price * 100), // paise / cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/credits?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/credits?payment=cancelled`,
      metadata: { paymentId: payment.id, userId, planId },
    });

    await PaymentModel.updateStatus(payment.id, 'pending', session.id);
    return { checkoutUrl: session.url, paymentId: payment.id };
  },

  // Called by Stripe webhook — verifies signature then processes
  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch {
      throw new AppError('Webhook signature verification failed', 400);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await PaymentService.handleWebhookSuccess(session.id);
    } else if (
      event.type === 'checkout.session.expired' ||
      event.type === 'payment_intent.payment_failed'
    ) {
      const obj = event.data.object as Stripe.Checkout.Session;
      await PaymentService.handleWebhookFailure(obj.id);
    }
  },

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
