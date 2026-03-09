'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { CreditBalance } from '@/components/credits/CreditBalance';
import { JobCard } from '@/components/jobs/JobCard';
import { Spinner, Button } from '@/components/ui';
import { ROUTES } from '@/constants';
import { Job } from '@/types';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [balance, setBalance] = useState(0);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState({ applications: 0, saved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ balance: number }>('/credits/balance'),
      api.getPaginated<Job>('/jobs?limit=4&sort=date'),
      api.getPaginated<unknown>('/applications/my?limit=1'),
      api.get<unknown[]>('/users/me/saved-jobs'),
    ]).then(([credit, jobs, apps, saved]) => {
      setBalance(credit.data.balance);
      setRecentJobs(jobs.data);
      setStats({ applications: apps.pagination.total, saved: (saved.data as unknown[]).length });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! 👋</h1>
        <p className="text-sm text-gray-500">Here&apos;s your overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CreditBalance balance={balance} />
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-3xl">📋</span>
          <div>
            <p className="text-xs font-medium text-gray-500">Applications</p>
            <p className="text-2xl font-bold text-gray-900">{stats.applications}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-3xl">🔖</span>
          <div>
            <p className="text-xs font-medium text-gray-500">Saved Jobs</p>
            <p className="text-2xl font-bold text-gray-900">{stats.saved}</p>
          </div>
        </div>
      </div>

      {/* Latest Jobs */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Latest Job Openings</h2>
          <Link href={ROUTES.jobs} className="text-sm text-blue-600 hover:underline">View all →</Link>
        </div>
        <div className="space-y-3">
          {recentJobs.map((job) => (
            <JobCard key={job.id} job={job} actions={
              <Link href={ROUTES.jobDetail(job.id)}>
                <Button size="sm">View & Apply</Button>
              </Link>
            } />
          ))}
        </div>
      </div>
    </div>
  );
}
