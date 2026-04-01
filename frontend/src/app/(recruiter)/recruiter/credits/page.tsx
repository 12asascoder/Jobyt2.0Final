'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { CreditTransaction, Plan } from '@/types';
import toast from 'react-hot-toast';
import { ROUTES } from '@/constants';

export default function RecruiterCreditsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingPlan, setBuyingPlan] = useState<string | null>(null);

  const formattedTransactions = transactions.map((t) => ({
    id: t.id,
    transaction: t.description || t.type,
    transactionNo: t.id.slice(0, 10),
    date: new Date(t.created_at).toLocaleDateString(),
    status: t.status || 'success',
    total: Math.abs(t.amount),
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
      const res = await api.post<{ checkoutUrl: string }>('/payments/checkout', { planId });
      if (res.data.checkoutUrl) window.location.href = res.data.checkoutUrl;
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
          onClick={() => router.push('/recruiter/credits/earn')}
          className="rounded-lg bg-lime-400 px-4 py-2 text-sm font-bold text-black hover:bg-lime-300"
        >
          Earn Credits
        </button>
      </section>

      <h2 className="text-center text-[38px] font-black tracking-tight text-slate-900 mb-4">Credit Plans</h2>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {(topPlans.length > 0 ? topPlans : [
          { id: 'free', name: 'Free', credits: 200, price: 0, currency: 'INR' },
          { id: 'pro', name: 'Pro', credits: 600, price: 299, currency: 'INR' },
          { id: 'enterprise', name: 'Enterprise', credits: 1500, price: 699, currency: 'INR' },
        ]).map((plan) => {
          const isFree = Number(plan.price) === 0;
          const isFallback = !plans.length;
          const isLoadingPlan = buyingPlan === plan.id;

          return (
            <article key={plan.id} className="rounded-xl bg-black text-center px-6 py-7 min-h-[252px] flex flex-col items-center">
              <h3 className="text-white text-4xl font-black mb-3">{plan.name}</h3>
              <p className="text-lime-300 text-5xl font-black leading-none">{Number(plan.credits).toLocaleString()}</p>
              <p className="text-lime-300 text-[10px] tracking-[0.2em] mt-1">CREDITS</p>
              <p className="text-white text-xl mt-3">{isFree ? 'New User' : `Rs. ${Number(plan.price).toLocaleString()}/-`}</p>
              <button
                type="button"
                disabled={isLoadingPlan || isFallback || isFree}
                onClick={() => handleBuyPlan(plan.id)}
                className={`mt-auto rounded-md px-4 py-2 text-sm font-bold w-[130px] ${
                  isFree || isFallback
                    ? 'bg-zinc-700 text-zinc-300 cursor-not-allowed'
                    : 'bg-lime-400 text-black hover:bg-lime-300'
                }`}
              >
                {isFree ? 'Credits Claimed' : isLoadingPlan ? 'Processing...' : 'Buy Now'}
              </button>
            </article>
          );
        })}
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
                <th className="text-left py-2">Total</th>
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
