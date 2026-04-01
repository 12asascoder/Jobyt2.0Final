'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { CreditTransaction, Plan } from '@/types';
import toast from 'react-hot-toast';

type RazorpayCheckoutResponse = {
  paymentId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  plan: {
    id: string;
    name: string;
    credits: number;
  };
};

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => Promise<void>;
  theme: {
    color: string;
  };
};

type RazorpayInstance = {
  on: (event: 'payment.failed', handler: () => void) => void;
  open: () => void;
};

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const loadRazorpayScript = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (window.Razorpay) return true;

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function RecruiterCreditsPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingPlan, setBuyingPlan] = useState<string | null>(null);

  const formatSignedAmount = (amount: number, type?: string) => {
    if (type === 'debit') return `-${Math.abs(amount)}`;
    if (type === 'credit') return `+${Math.abs(amount)}`;
    return `${amount > 0 ? '+' : ''}${amount}`;
  };

  const formattedTransactions = transactions.map((t) => ({
    id: t.id,
    transaction: t.description || t.type,
    transactionNo: t.id.slice(0, 10),
    date: new Date(t.created_at).toLocaleDateString(),
    status: t.status || 'success',
    total: formatSignedAmount(t.amount, t.type),
  }));

  useEffect(() => {
    Promise.all([
      api.get<{ balance: number }>('/credits/balance'),
      api.getPaginated<CreditTransaction>('/credits/ledger'),
      api.get<Plan[]>('/payments/plans'),
    ]).then(([bal, txns, plansRes]) => {
      setBalance(bal.data?.balance ?? 0);
      setTransactions(txns.data ?? []);
      setPlans(plansRes.data ?? []);
    }).catch((err) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not load credits data');
    }).finally(() => setLoading(false));
  }, []);

  const handleBuyPlan = async (planId: string) => {
    setBuyingPlan(planId);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Unable to load Razorpay checkout. Please try again.');
      }

      const res = await api.post<RazorpayCheckoutResponse>('/payments/checkout', { planId });
      const checkout = res.data;

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not available after script load');
      }

      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'Jobyt',
        description: `${checkout.plan.name} - ${checkout.plan.credits} Credits`,
        order_id: checkout.razorpayOrderId,
        handler: async (response: RazorpaySuccessResponse) => {
          await api.post('/payments/verify', response);
          toast.success(`${checkout.plan.credits} credits added successfully`);

          const [bal, txns] = await Promise.all([
            api.get<{ balance: number }>('/credits/balance'),
            api.getPaginated<CreditTransaction>('/credits/ledger'),
          ]);
          setBalance(bal.data.balance);
          setTransactions(txns.data);
        },
        theme: {
          color: '#84cc16',
        },
      });

      razorpay.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
      });

      razorpay.open();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Checkout failed');
    } finally {
      setBuyingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const topPlans = plans.slice(0, 3);

  return (
    <div className="mx-auto max-w-[1120px]">
      <h1 className="text-center text-[42px] leading-tight font-black tracking-tight text-slate-900 mb-4">Credits &amp; Plans</h1>

      <section className="mb-6 rounded-2xl bg-black text-lime-300 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider font-bold">Credit Balance</p>
          <p className="text-5xl font-black leading-none mt-2">{balance.toLocaleString()}</p>
        </div>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 420, behavior: 'smooth' })}
          className="rounded-lg bg-lime-400 px-4 py-2 text-sm font-bold text-black hover:bg-lime-300"
        >
          Earn Credits
        </button>
      </section>

      <h2 className="text-center text-[38px] font-black tracking-tight text-slate-900 mb-4">Credit Plans</h2>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {topPlans.map((plan) => {
          const isFree = Number(plan.price) === 0;
          const isLoadingPlan = buyingPlan === plan.id;

          return (
            <article key={plan.id} className="rounded-xl bg-black text-center px-6 py-7 min-h-[252px] flex flex-col items-center">
              <h3 className="text-white text-4xl font-black mb-3">{plan.name}</h3>
              <p className="text-lime-300 text-5xl font-black leading-none">{Number(plan.credits).toLocaleString()}</p>
              <p className="text-lime-300 text-[10px] tracking-[0.2em] mt-1">CREDITS</p>
              <p className="text-white text-xl mt-3">{isFree ? 'New User' : `Rs. ${Number(plan.price).toLocaleString()}/-`}</p>
              <button
                type="button"
                disabled={isLoadingPlan || isFree}
                onClick={() => handleBuyPlan(plan.id)}
                className={`mt-auto rounded-md px-4 py-2 text-sm font-bold w-[130px] ${
                  isFree
                    ? 'bg-zinc-700 text-zinc-300 cursor-not-allowed'
                    : 'bg-lime-400 text-black hover:bg-lime-300'
                }`}
              >
                {isFree ? 'Credits Claimed' : isLoadingPlan ? 'Processing...' : 'Buy Now'}
              </button>
            </article>
          );
        })}
        {topPlans.length === 0 && (
          <div className="col-span-full rounded-xl bg-black/90 p-10 text-center">
            <p className="text-white/70 text-lg font-medium">No credit plans available at the moment.</p>
            <p className="text-white/40 mt-2">Check back soon for new plans.</p>
          </div>
        )}
      </section>

      <h2 className="text-center text-[38px] font-black tracking-tight text-slate-900 mb-4">Transaction History</h2>
      <section className="rounded-2xl bg-[#ece9e2] p-5 overflow-x-auto">
        {formattedTransactions.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions yet.</p>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="text-slate-600">
              <tr>
                <th className="text-left py-2">Transaction</th>
                <th className="text-left py-2">Transaction No.</th>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">+/-</th>
              </tr>
            </thead>
            <tbody>
              {formattedTransactions.map((tx) => {
                const success = tx.status === 'success';
                return (
                  <tr key={tx.id} className="border-t border-black/5">
                    <td className="py-2.5 text-slate-800">{tx.transaction}</td>
                    <td className="py-2.5 text-slate-700">#{tx.transactionNo}</td>
                    <td className="py-2.5 text-slate-700">{tx.date}</td>
                    <td className="py-2.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${success ? 'bg-lime-200 text-lime-900' : 'bg-rose-200 text-rose-900'}`}>
                        {success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-800">{tx.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
