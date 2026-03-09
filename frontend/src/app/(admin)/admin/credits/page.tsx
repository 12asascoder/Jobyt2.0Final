'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner, Badge, Button, Input, Card, CardBody } from '@/components/ui';
import { CreditTransaction } from '@/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminCreditsPage() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchTransactions = async () => {
    const res = await api.getPaginated<CreditTransaction>('/admin/credits?limit=50');
    setTransactions(res.data);
  };

  useEffect(() => {
    fetchTransactions().finally(() => setLoading(false));
  }, []);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUserId || !adjustAmount || !adjustReason) return;
    setAdjusting(true);
    try {
      await api.post(`/admin/credits/${adjustUserId}/adjust`, {
        amount: Number(adjustAmount),
        reason: adjustReason,
      });
      toast.success('Credits adjusted');
      setAdjustAmount('');
      setAdjustReason('');
      setAdjustUserId('');
      await fetchTransactions();
    } catch {
      toast.error('Failed to adjust credits');
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Credit Management</h1>

      {/* Manual adjustment */}
      <Card>
        <CardBody className="p-6">
          <h2 className="mb-4 font-semibold text-gray-800">Manual Credit Adjustment</h2>
          <form onSubmit={handleAdjust} className="space-y-3">
            <Input
              label="User ID"
              value={adjustUserId}
              onChange={(e) => setAdjustUserId(e.target.value)}
              placeholder="Paste user UUID"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Amount (negative to deduct)"
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 50 or -10"
                required
              />
              <Input
                label="Reason *"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Admin adjustment reason"
                required
              />
            </div>
            <Button type="submit" isLoading={adjusting}>Apply Adjustment</Button>
          </form>
        </CardBody>
      </Card>

      {/* All transactions */}
      <Card>
        <CardBody className="p-6">
          <h2 className="mb-4 font-semibold text-gray-800">Recent Transactions (All Users)</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400">No transactions yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-right">Balance After</th>
                    <th className="px-4 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800">{tx.description}</td>
                      <td className="px-4 py-2 text-right">
                        <Badge variant={tx.type === 'credit' ? 'success' : 'danger'}>
                          {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500">{tx.balance_after}</td>
                      <td className="px-4 py-2 text-gray-400">{formatDate(tx.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
