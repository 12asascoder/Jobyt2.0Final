'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { CreditBalance } from '@/components/credits/CreditBalance';
import { Spinner, Card, CardBody, CardHeader, Button } from '@/components/ui';
import { CreditTransaction, Plan } from '@/types';
import toast from 'react-hot-toast';

export default function RecruiterCreditsPage() {
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
      api.getPaginated<CreditTransaction>('/credits/history'),
      api.get<Plan[]>('/payments/plans'),
    ]).then(([bal, txns, plansRes]) => {
      setBalance(bal.data.balance);
      setTransactions(txns.data);
      setPlans(plansRes.data);
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
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Credits & Plans</h1>
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
        💡 Publishing a job costs <strong>10 credits</strong>. Top up to keep posting.
      </div>
      <CreditBalance balance={balance} />

      <div>
        <h2 className="mb-3 font-semibold text-gray-800">Top Up Credits</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="text-center">
              <CardBody className="p-5">
                <p className="text-lg font-bold text-gray-900">{plan.name}</p>
                <p className="mt-1 text-3xl font-bold text-blue-600">{plan.credits.toLocaleString()}</p>
                <p className="text-xs text-gray-400">credits</p>
                <p className="mt-2 text-lg font-semibold text-gray-700">₹{plan.price}</p>
                <Button
                  className="mt-4 w-full"
                  size="sm"
                  isLoading={buyingPlan === plan.id}
                  onClick={() => handleBuyPlan(plan.id)}
                >
                  Buy Plan
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader><p className="font-semibold">Transaction History</p></CardHeader>
        {formattedTransactions.length === 0 ? (
          <CardBody><p className="text-sm text-gray-400">No transactions yet.</p></CardBody>
        ) : (
          <CardBody className="p-4 sm:p-6 overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-left py-2">Transaction</th>
                  <th className="text-left py-2">Transaction No.</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {formattedTransactions.map((tx) => (
                  <tr key={tx.id} className="border-t border-slate-100">
                    <td className="py-3 text-slate-800">{tx.transaction}</td>
                    <td className="py-3 text-slate-700">#{tx.transactionNo}</td>
                    <td className="py-3 text-slate-700">{tx.date}</td>
                    <td className="py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          tx.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {tx.status === 'success' ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-800">{tx.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
