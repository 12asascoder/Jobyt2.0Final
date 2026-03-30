'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Job } from '@/types';
import { Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { FaEye, FaLocationDot, FaPenToSquare, FaTrash } from 'react-icons/fa6';

const formatRelative = (isoDate: string) => {
  const now = Date.now();
  const time = new Date(isoDate).getTime();
  const diffMs = now - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const mins = Math.max(1, Math.floor(diffMs / minute));
    return `${mins} minutes ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours} hours ago`;
  }
  const days = Math.floor(diffMs / day);
  return `${days} days ago`;
};

const statusPillClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'active') return 'bg-lime-300 text-black';
  if (normalized === 'closed') return 'bg-slate-700 text-white';
  return 'bg-slate-200 text-slate-700';
};

export default function RecruiterJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPaginated<Job>('/jobs/my/listings?limit=50')
      .then((res) => setJobs(res.data))
      .finally(() => setLoading(false));
  }, []);

  const closeJob = async (id: string) => {
    if (!confirm('Close this job listing? It will stop accepting new applications.')) return;
    await api.patch(`/jobs/${id}/close`, {});
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'closed' } : j)));
  };

  const publishJob = async (id: string) => {
    await api.patch<Job>(`/jobs/${id}/publish`, {});
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: 'active' } : j));
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-[1180px] mx-auto">
      <div className="mb-4">
        <h1 className="text-[46px] leading-[1.02] font-black tracking-tight text-slate-900">Job Listings</h1>
        <p className="mt-1 text-[31px] leading-tight text-slate-700">Manage and track all your internship postings</p>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-slate-300 py-16 text-center bg-[#ece9e2]">
          <p className="text-slate-500 mb-4">You haven&apos;t posted any jobs yet.</p>
          <Link href={ROUTES.recruiterNewJob}><Button>Post Your First Job</Button></Link>
        </div>
      ) : (
        <div className="rounded-[18px] bg-[#ece9e2] border border-[#e3dfd7] p-4 h-[620px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#111827_transparent]">
          <div className="space-y-2.5">
            {jobs.map((job) => (
              <article key={job.id} className="rounded-[14px] bg-white px-5 py-4 border border-slate-100">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[30px] leading-tight font-bold text-slate-900 truncate">{job.title}</h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <FaLocationDot className="text-[10px]" />
                        {job.location || 'Remote'}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="inline-flex rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-semibold leading-none text-slate-700">
                        {job.type === 'remote' ? 'Remote' : 'Onsite'}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span>3 months</span>
                    </div>
                    <p className="mt-2 text-[13px] text-slate-600 line-clamp-1">
                      {job.description}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[12px] text-slate-500">
                      <span>
                        {job.salary_min ? `₹${job.salary_min.toLocaleString()}/month` : 'Salary not specified'}
                      </span>
                      <span>•</span>
                      <span>{Number(job.application_count ?? 0)} applications</span>
                      <span>•</span>
                      <span>{Number(job.views_count ?? 0)} views</span>
                      <span>•</span>
                      <span>Posted {formatRelative(job.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black tracking-wide uppercase leading-none ${statusPillClass(job.status)}`}>
                      {job.status}
                    </span>
                    {job.status !== 'closed' && (
                      <>
                        <button
                          onClick={() => closeJob(job.id)}
                          className="text-slate-700 hover:text-rose-600 transition-colors"
                          title="Close listing"
                        >
                          <FaTrash className="text-[14px]" />
                        </button>
                        <Link
                          href={ROUTES.recruiterJobDetail(job.id)}
                          className="text-slate-700 hover:text-black transition-colors"
                          title="Edit listing"
                        >
                          <FaPenToSquare className="text-[14px]" />
                        </Link>
                      </>
                    )}
                    {job.status === 'draft' && (
                      <Button size="sm" variant="secondary" onClick={() => publishJob(job.id)}>
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
