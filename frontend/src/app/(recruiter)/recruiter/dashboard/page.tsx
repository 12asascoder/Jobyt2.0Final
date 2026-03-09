'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { CreditBalance } from '@/components/credits/CreditBalance';
import { Spinner, Button, Badge } from '@/components/ui';
import { ROUTES, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from '@/constants';
import { Job } from '@/types';

interface RecruiterSummary {
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  pending_applications: number;
}

interface RecentApplication {
  id: string;
  applicant_name: string;
  job_title: string;
  status: string;
  created_at: string;
}

export default function RecruiterDashboardPage() {
  const { user } = useAuthStore();
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState<RecruiterSummary | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ balance: number }>('/credits/balance'),
      api.get<RecruiterSummary>('/analytics/summary'),
      api.getPaginated<Job>('/jobs/my/listings?limit=4'),
    ]).then(([credit, sumRes, jobsRes]) => {
      setBalance(credit.data.balance);
      setSummary(sumRes.data);
      setRecentJobs(jobsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
        </h1>
        <p className="text-sm text-gray-500">Here&apos;s your recruiting overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <CreditBalance balance={balance} />
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-3xl">💼</span>
          <div>
            <p className="text-xs font-medium text-gray-500">Active Jobs</p>
            <p className="text-2xl font-bold text-gray-900">{summary?.active_jobs ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-3xl">📋</span>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Applications</p>
            <p className="text-2xl font-bold text-gray-900">{summary?.total_applications ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-3xl">⏳</span>
          <div>
            <p className="text-xs font-medium text-gray-500">Pending Review</p>
            <p className="text-2xl font-bold text-gray-900">{summary?.pending_applications ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Your Job Listings</h2>
          <div className="flex gap-2">
            <Link href={ROUTES.recruiterJobs} className="text-sm text-blue-600 hover:underline">View all →</Link>
          </div>
        </div>
        {recentJobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
            <p className="text-gray-400 mb-3">No jobs posted yet.</p>
            <Link href={ROUTES.recruiterNewJob}>
              <Button>Post Your First Job</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div>
                  <p className="font-medium text-gray-900">{job.title}</p>
                  <p className="text-xs text-gray-400">{job.location} · {job.views_count} views</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={job.status === 'active' ? 'success' : job.status === 'draft' ? 'default' : 'danger'}>
                    {job.status}
                  </Badge>
                  <Link href={ROUTES.recruiterJobApplications(job.id)}>
                    <Button size="sm" variant="outline">Applications</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Link href={ROUTES.recruiterNewJob}>
          <Button>+ Post New Job</Button>
        </Link>
        <Link href={ROUTES.recruiterAnalytics}>
          <Button variant="outline">View Analytics</Button>
        </Link>
      </div>
    </div>
  );
}
