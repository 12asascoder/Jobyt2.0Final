'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

interface AnalyticsSummary {
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  total_hired: number;
  total_views: number;
}

interface TopJob {
  id: string;
  title: string;
  views_count: number;
  status: string;
  application_count: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  top_jobs: TopJob[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get<AnalyticsData>('/analytics/summary');
        setData(response.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>No analytics data available</p>
      </div>
    );
  }

  const pendingApplications = data.summary.total_applications - data.summary.total_hired;
  const top5Jobs = data.top_jobs.slice(0, 5);
  const totalApplications = top5Jobs.reduce((sum, job) => sum + job.application_count, 0);

  const COLORS = ['#FFD700', '#87CEEB', '#FF69B4', '#90EE90', '#FFB6C1'];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-6">
      <section>
        <h1 className="text-[44px] leading-[1.05] font-black tracking-tight text-black">Analytics</h1>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: ['TOTAL', 'JOBS'], value: data.summary.total_jobs },
          { label: ['ACTIVE', 'JOBS'], value: data.summary.active_jobs },
          { label: ['PENDING', 'APPLICATIONS'], value: pendingApplications },
          { label: ['TOTAL', 'VIEWS'], value: data.summary.total_views },
        ].map((stat) => (
          <article key={stat.label.join('-')} className="rounded-2xl bg-black text-lime-300 px-5 py-4 shadow-xl min-h-[92px] flex items-center">
            <div className="flex items-end gap-4">
              <p className="text-[38px] leading-none font-black tracking-tight">{stat.value}</p>
              <div className="pb-1">
                {stat.label.map((line) => (
                  <p key={line} className="text-[11px] uppercase tracking-[0.09em] font-bold leading-tight">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Applications Chart */}
      <div className="max-w-2xl">
        <article className="rounded-3xl bg-white border-4 border-lime-300 p-8">
          <h2 className="text-2xl font-black text-slate-900 mb-6">Applications (Last 30 Days)</h2>

          {totalApplications === 0 ? (
            <div className="text-center p-8">
              <p className="text-sm text-slate-500">No application data available.</p>
            </div>
          ) : (
            <div>
              {/* Stacked Bar Chart */}
              <div className="mb-8">
                <div className="flex h-6 rounded-full overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  {top5Jobs.map((job, idx) => {
                    const percentage = (job.application_count / totalApplications) * 100;
                    return (
                      <div
                        key={job.id}
                        style={{
                          backgroundColor: COLORS[idx % COLORS.length],
                          width: `${percentage}%`,
                        }}
                        title={`${job.title}: ${job.application_count} (${percentage.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-4">
                {top5Jobs.map((job, idx) => {
                  const percentage = (job.application_count / totalApplications) * 100;
                  return (
                    <div key={job.id} className="flex items-center gap-3 justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        ></div>
                        <span className="text-base text-slate-700 font-medium">{job.title}</span>
                      </div>
                      <span className="text-base font-semibold text-slate-900">{percentage.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
