'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { normalizeCompany } from '@/lib/utils';
import { Job } from '@/types';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { FaPencil, FaTrash, FaPlus } from 'react-icons/fa6';
import toast from 'react-hot-toast';

interface ExtendedJob extends Job {
  application_count?: number;
  duration?: string | null;
}

const formatRelative = (isoDate: string) => {
  const now = Date.now();
  const time = new Date(isoDate).getTime();
  const diffMs = now - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const mins = Math.max(1, Math.floor(diffMs / minute));
    return `${mins}m ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours}h ago`;
  }
  const days = Math.floor(diffMs / day);
  return `${days}d ago`;
};

import { formatSalaryRange } from '@/lib/salary';

const getJobStatusDisplay = (job: ExtendedJob) => {
  if (job.job_approval_status === 'pending_approval') {
    return { label: 'UNDER REVIEW', className: 'bg-black text-lime-300' };
  }
  if (job.job_approval_status === 'rejected') {
    return { label: 'REJECTED', className: 'bg-black text-lime-300' };
  }
  if (job.job_approval_status === 'approved') {
    return { label: 'ACTIVE', className: 'bg-lime-300 text-black' };
  }
  if (job.status === 'active') {
    return { label: 'ACTIVE', className: 'bg-lime-300 text-black' };
  }
  if (job.status === 'draft') {
    return { label: 'DRAFT', className: 'bg-slate-100 text-slate-700' };
  }
  return { label: 'CLOSED', className: 'bg-slate-300 text-slate-700' };
};

export default function RecruiterJobsPage() {
  const [jobs, setJobs] = useState<ExtendedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.getPaginated<ExtendedJob>('/jobs/my/listings?limit=50');
      setJobs((res.data ?? []).map(normalizeCompany));
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Close job "${title}"? This cannot be undone.`)) return;
    
    setDeleting(id);
    try {
      await api.delete(`/jobs/${id}`);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      toast.success('Job listing closed');
    } catch (err) {
      toast.error('Failed to close job listing');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-6">
      <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[44px] leading-[1.05] font-black tracking-tight text-black">Job Listings</h1>
            <p className="mt-2 text-xl leading-tight text-black/80">Manage and track all your internship postings</p>
          </div>
          <Link href={ROUTES.recruiterNewJob} className="shrink-0">
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-lime-300 rounded-lg hover:bg-slate-900 font-semibold whitespace-nowrap">
              <FaPlus className="text-xs" />
              Post New Job
            </button>
          </Link>
        </section>

        <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: '#ece9e2' }}>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-white">
          <p className="text-sm text-slate-500 mb-4">You haven&apos;t posted any jobs yet.</p>
          <Link href={ROUTES.recruiterNewJob} className="inline-block">
            <button className="px-4 py-2 bg-black text-white rounded-lg hover:bg-slate-900">
              Post Your First Job
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const statusDisplay = getJobStatusDisplay(job);
            return (
            <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-6 hover:shadow-sm transition-shadow">
              {/* Header Row: Title and Status Badge */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-lg font-black text-slate-900 flex-1">{job.title}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${statusDisplay.className}`}>
                    {statusDisplay.label}
                  </span>
                  {job.status !== 'closed' && (
                    <>
                      <Link href={ROUTES.recruiterJobDetail(job.id)}>
                        <button className="px-3 h-8 rounded-lg bg-black text-lime-300 hover:bg-slate-900 text-xs font-bold transition-colors">
                          View Details
                        </button>
                      </Link>
                      <Link href={ROUTES.recruiterJobDetail(job.id)}>
                        <button className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors">
                          <FaPencil className="text-xs" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(job.id, job.title)}
                        disabled={deleting === job.id}
                        className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center transition-colors"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Location, Type, Duration Row */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700 mb-2">
                <span>{job.location || 'Remote'}</span>
                {job.location && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-xs font-medium">Remote</span>
                  </>
                )}
                {job.duration && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span>{job.duration}</span>
                  </>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                {job.description}
              </p>

              {/* Footer: Stats and Actions */}
              <div className="flex items-center">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
                  {(job.salary_min || job.salary_max) && (
                    <>
                      <span>{formatSalaryRange(job.salary_min, job.salary_max, job.type)}</span>
                      <span className="text-slate-400">•</span>
                    </>
                  )}
                  <span>{job.application_count ?? 0} applications</span>
                  <span className="text-slate-400">•</span>
                  <span>{job.views_count} views</span>
                  <span className="text-slate-400">•</span>
                  <span>Posted {formatRelative(job.created_at)}</span>
                </div>
              </div>
            </div>
          )})}
        </div>
      )}
      </div>
    </div>
  );
}
