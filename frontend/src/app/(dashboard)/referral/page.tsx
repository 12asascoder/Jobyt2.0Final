'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardBody, Spinner, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

interface ReferralEntry {
  referred_email: string;
  status: string;
  referred_credited: boolean;
  created_at: string;
}

interface ReferralDashboard {
  code: string;
  link: string;
  total_referrals: number;
  credited_referrals: number;
  credits_earned: number;
  referrals: ReferralEntry[];
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get<ReferralDashboard>('/referrals/dashboard')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Referral Program</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardBody className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Referrals</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{data.total_referrals}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Credited</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{data.credited_referrals}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Credits Earned</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{data.credits_earned}</p>
          </CardBody>
        </Card>
      </div>

      {/* Referral link */}
      <Card>
        <CardBody className="p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Your Referral Link</h2>
          <p className="text-xs text-gray-500 mb-3">
            Earn 50 credits when a friend registers and 25 more when they verify their email.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={data.link}
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-700 focus:outline-none"
            />
            <button
              onClick={() => copy(data.link)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">Code: <span className="font-mono font-semibold">{data.code}</span></p>
        </CardBody>
      </Card>

      {/* Referral list */}
      <Card>
        <CardBody className="p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Your Referrals</h2>
          {data.referrals.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No referrals yet. Share your link to start earning!</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.referrals.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.referred_email}</p>
                    <p className="text-xs text-gray-400">{formatDate(r.created_at)}</p>
                  </div>
                  <Badge variant={r.referred_credited ? 'success' : 'default'}>
                    {r.referred_credited ? 'Credited' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
