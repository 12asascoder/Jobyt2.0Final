'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardBody, Spinner } from '@/components/ui';

interface Summary {
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  total_views: number;
  avg_time_to_hire_days: number | null;
}

interface DailyItem {
  date: string;
  count: number;
}

interface CreditUsageItem {
  description: string;
  total: number;
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [daily, setDaily] = useState<DailyItem[]>([]);
  const [creditUsage, setCreditUsage] = useState<CreditUsageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Summary>('/analytics/summary'),
      api.get<DailyItem[]>('/analytics/applications-by-day'),
      api.get<CreditUsageItem[]>('/analytics/credit-usage'),
    ]).then(([s, d, c]) => {
      setSummary(s.data);
      setDaily(d.data);
      setCreditUsage(c.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const maxDailyCount = Math.max(...daily.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Jobs', value: summary?.total_jobs ?? 0, icon: '💼' },
          { label: 'Active Jobs', value: summary?.active_jobs ?? 0, icon: '✅' },
          { label: 'Total Applications', value: summary?.total_applications ?? 0, icon: '📋' },
          { label: 'Total Views', value: summary?.total_views ?? 0, icon: '👁️' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardBody className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily applications chart */}
        <Card>
          <CardBody className="p-6">
            <h2 className="mb-4 font-semibold text-gray-800">Applications (Last 30 Days)</h2>
            {daily.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No data yet</p>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {daily.slice(-30).map((item) => (
                  <div
                    key={item.date}
                    className="flex-1 bg-blue-400 rounded-t hover:bg-blue-600 transition-colors cursor-default"
                    style={{ height: `${(item.count / maxDailyCount) * 100}%`, minHeight: item.count > 0 ? '4px' : '0' }}
                    title={`${item.date}: ${item.count}`}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Credit usage */}
        <Card>
          <CardBody className="p-6">
            <h2 className="mb-4 font-semibold text-gray-800">Credit Usage</h2>
            {creditUsage.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {creditUsage.map((item) => (
                  <div key={item.description} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate max-w-[70%]">{item.description}</span>
                    <span className="font-semibold text-gray-900">{item.total}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {summary?.avg_time_to_hire_days != null && (
        <Card>
          <CardBody className="p-4 flex items-center gap-3">
            <span className="text-3xl">⏱️</span>
            <div>
              <p className="text-xs text-gray-500">Average Time to Hire</p>
              <p className="text-2xl font-bold text-gray-900">{summary.avg_time_to_hire_days.toFixed(1)} days</p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
