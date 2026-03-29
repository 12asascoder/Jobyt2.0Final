'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { CreditTransaction, Plan } from '@/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function CreditsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingPlan, setBuyingPlan] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ balance: number }>('/credits/balance'),
      api.getPaginated<CreditTransaction>('/credits/history'),
      api.get<Plan[]>('/payments/plans'),
    ]).then(([bal, txns, plansRes]) => {
      setBalance(bal.data.balance);
      setTransactions(txns.data);
      setPlans(plansRes.data);
    }).catch(() => {
      // fail silently for ui demonstration
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

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8 sm:space-y-10 px-3 sm:px-4 py-6 sm:py-8">
      <h1 className="text-3xl font-display font-medium text-center text-slate-900 tracking-tight">Credits & Plans</h1>

      <section className="rounded-3xl bg-[#060606] px-5 py-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-[#c1f237] text-xs sm:text-sm font-medium tracking-wide uppercase">Credit Balance</p>
          <p className="text-[#c1f237] text-5xl sm:text-7xl font-semibold leading-none mt-2">{balance}</p>
        </div>
        <button
          onClick={() => router.push('/credits/earn')}
          className="w-full sm:w-auto bg-[#c1f237] hover:bg-[#b0e025] text-black text-sm sm:text-base font-medium px-5 py-2.5 sm:py-2 rounded-xl transition-colors whitespace-nowrap"
        >
          Earn Credits
        </button>
      </section>

      {/* Credit Plans */}
      <div>
        <h2 className="text-[28px] font-display font-medium text-center text-slate-900 mb-8 tracking-tight">Credit Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {plans.length > 0 ? plans.map((plan) => {
            const isFree = plan.price === 0;
            return (
              <div key={plan.id} className="bg-[#0a0a0a] rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center">
                <h3 className="text-white text-[26px] font-display font-medium mb-6">{plan.name}</h3>
                <div className="mb-0.5">
                  <span className="text-[#c1f237] text-[40px] font-semibold">{plan.credits}</span>
                </div>
                <p className="text-[#c1f237] text-xs tracking-widest mb-6">CREDITS</p>
                <p className="text-white/70 text-[15px] font-medium mb-6">
                  {isFree ? 'New User' : `Rs. ${plan.price}/-`}
                </p>
                <div className="mt-auto w-full">
                  <button
                    onClick={() => !isFree && handleBuyPlan(plan.id)}
                    disabled={isFree || buyingPlan === plan.id}
                    className={`w-full py-2.5 px-4 rounded-lg font-medium text-[15px] transition-colors ${isFree
                        ? 'bg-[#2a2a2a] text-[#8e8e8e] cursor-not-allowed'
                        : 'bg-[#c1f237] hover:bg-[#b0e025] text-black'
                      }`}
                  >
                    {isFree ? 'Credits Claimed' : buyingPlan === plan.id ? 'Processing...' : 'Buy Now'}
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full bg-[#0a0a0a] rounded-2xl p-8 text-center">
              <p className="text-white/60 text-lg font-medium">No credit plans available at the moment.</p>
              <p className="text-white/40 text-sm mt-2">Check back soon for new plans.</p>
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="pt-1 sm:pt-2">
        <h2 className="text-[28px] font-display font-medium text-center text-slate-900 mb-8 tracking-tight">Transaction History</h2>

        <div className="bg-[#e7e4dd] rounded-[20px] p-4 sm:p-8 overflow-x-auto">
          <table className="w-full min-w-160 text-left border-collapse border-spacing-0">
            <thead>
              <tr>
                <th className="font-semibold text-slate-800 pb-8 px-2 text-[15px]">Transaction</th>
                <th className="font-semibold text-slate-800 pb-8 px-2 text-[15px]">Transaction No.</th>
                <th className="font-semibold text-slate-800 pb-8 px-2 text-[15px]">Date</th>
                <th className="font-semibold text-slate-800 pb-8 px-2 text-[15px]">Status</th>
                <th className="font-semibold text-slate-800 pb-8 px-2 text-center text-[15px]">Total</th>
              </tr>
            </thead>
            <tbody className="space-y-4">
              {transactions.length > 0 ? (
                transactions.map((tx, idx) => {
                  const isCredit = tx.type === 'credit';
                  return (
                    <tr key={tx.id} className="text-[#3b3b3b] text-[15px]">
                      <td className="py-4 px-2">{tx.description || 'Lorem ipsum'}</td>
                      <td className="py-4 px-2">#{tx.id.substring(0, 10).toUpperCase()}</td>
                      <td className="py-4 px-2">{formatDate(tx.created_at)}</td>
                      <td className="py-4 px-2">
                        <span className={`inline-flex items-center justify-center px-4 py-1.5 text-xs font-semibold rounded-full ${isCredit ? 'bg-[#ccfa88] text-black' : 'bg-[#facaca] text-slate-900'}`}>
                          {isCredit ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-center font-medium">{tx.amount}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500 text-[15px] font-medium">
                    No transactions yet. Your credit history will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
