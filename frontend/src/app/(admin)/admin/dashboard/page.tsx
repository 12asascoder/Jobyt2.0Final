'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardBody, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/utils';

interface PlatformMetrics {
  total_users: number;
  total_applicants: number;
  total_recruiters: number;
  active_jobs: number;
  total_applications: number;
  total_revenue: number;
}

interface DailyStat {
  date: string;
  new_users: number;
  new_jobs: number;
  new_applications: number;
}

interface MetricsResponse {
  metrics: PlatformMetrics;
  daily_stats: DailyStat[];
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<MetricsResponse>('/admin/metrics')
      .then((res) => {
        setMetrics(res.data.metrics);
        setDaily(res.data.daily_stats ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const stats = [
    { label: 'Total Users', value: metrics?.total_users ?? 0, icon: '👥' },
    { label: 'Applicants', value: metrics?.total_applicants ?? 0, icon: '🎓' },
    { label: 'Recruiters', value: metrics?.total_recruiters ?? 0, icon: '🏢' },
    { label: 'Active Jobs', value: metrics?.active_jobs ?? 0, icon: '💼' },
    { label: 'Applications', value: metrics?.total_applications ?? 0, icon: '📋' },
    { label: 'Revenue (₹)', value: metrics?.total_revenue ?? 0, icon: '💰' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {daily.length > 0 && (
        <Card>
          <CardBody className="p-6">
            <h2 className="mb-4 font-semibold text-gray-800">Daily Activity (Last 7 Days)</h2>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-right">New Users</th>
                    <th className="px-4 py-2 text-right">New Jobs</th>
                    <th className="px-4 py-2 text-right">Applications</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {daily.slice(-7).reverse().map((d) => (
                    <tr key={d.date} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600">{formatDate(d.date)}</td>
                      <td className="px-4 py-2 text-right text-gray-900">{d.new_users}</td>
                      <td className="px-4 py-2 text-right text-gray-900">{d.new_jobs}</td>
                      <td className="px-4 py-2 text-right text-gray-900">{d.new_applications}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
