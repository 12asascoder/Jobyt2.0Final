'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Job } from '@/types';
import { Button, Spinner, Badge } from '@/components/ui';
import { ROUTES } from '@/constants';
import { formatDate } from '@/lib/utils';

export default function RecruiterJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPaginated<Job>('/jobs/my/listings?limit=50')
      .then((res) => setJobs(res.data))
      .finally(() => setLoading(false));
  }, []);

  const deleteJob = async (id: string) => {
    if (!confirm('Delete this job? This cannot be undone.')) return;
    await api.delete(`/jobs/${id}`);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const publishJob = async (id: string) => {
    await api.patch<Job>(`/jobs/${id}/publish`, {});
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: 'active' } : j));
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Job Listings</h1>
        <Link href={ROUTES.recruiterNewJob}>
          <Button>+ Post New Job</Button>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-400 mb-4">You haven&apos;t posted any jobs yet.</p>
          <Link href={ROUTES.recruiterNewJob}><Button>Post Your First Job</Button></Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Job Title</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Views</th>
                <th className="px-4 py-3 text-left">Posted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{job.title}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{job.type}</td>
                  <td className="px-4 py-3">
                    <Badge variant={job.status === 'active' ? 'success' : job.status === 'draft' ? 'default' : 'danger'}>
                      {job.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{job.views_count}</td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(job.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={ROUTES.recruiterJobApplications(job.id)}>
                        <Button size="sm" variant="outline">Applications</Button>
                      </Link>
                      <Link href={ROUTES.recruiterJobDetail(job.id)}>
                        <Button size="sm" variant="ghost">Edit</Button>
                      </Link>
                      {job.status === 'draft' && (
                        <Button size="sm" variant="secondary" onClick={() => publishJob(job.id)}>Publish</Button>
                      )}
                      <Button size="sm" variant="danger" onClick={() => deleteJob(job.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
