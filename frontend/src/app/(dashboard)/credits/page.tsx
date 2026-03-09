'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { CreditBalance } from '@/components/credits/CreditBalance';
import { Spinner, Card, CardBody, CardHeader, Badge, Button } from '@/components/ui';
import { CreditTransaction, Plan } from '@/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function CreditsPage() {
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
      <CreditBalance balance={balance} />

      {/* Plans */}
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

      {/* Transaction history */}
      <Card>
        <CardHeader><p className="font-semibold">Transaction History</p></CardHeader>
        {transactions.length === 0 ? (
          <CardBody><p className="text-sm text-gray-400">No transactions yet.</p></CardBody>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{tx.description}</p>
                  <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                </div>
                <div className="text-right">
                  <Badge variant={tx.type === 'credit' ? 'success' : 'danger'}>
                    {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                  </Badge>
                  <p className="mt-0.5 text-xs text-gray-400">Balance: {tx.balance_after}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
