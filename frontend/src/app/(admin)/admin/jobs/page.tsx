'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Job } from '@/types';
import { Spinner, Badge, Button, Input } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<string | null>(null);

  const fetchJobs = async (q = search, p = page) => {
    setLoading(true);
    try {
      const res = await api.getPaginated<Job>(`/admin/jobs?page=${p}&limit=20${q ? `&search=${encodeURIComponent(q)}` : ''}`);
      setJobs(res.data);
      setTotal(res.pagination.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJobs(search, 1);
  };

  const closeJob = async (jobId: string) => {
    const reason = prompt('Close reason (required):');
    if (!reason) return;
    setActing(jobId);
    try {
      await api.patch(`/admin/jobs/${jobId}/close`, { reason });
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: 'closed' as const } : j));
      toast.success('Job closed');
    } catch {
      toast.error('Failed to close job');
    } finally {
      setActing(null);
    }
  };

  const deleteJob = async (jobId: string) => {
    const reason = prompt('Delete reason (required):');
    if (!reason) return;
    setActing(jobId);
    try {
      await api.delete(`/admin/jobs/${jobId}`, { reason });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success('Job deleted');
    } catch {
      toast.error('Failed to delete job');
    } finally {
      setActing(null);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Job Moderation</h1>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs..."
          className="max-w-sm"
        />
        <Button type="submit" size="sm">Search</Button>
      </form>

      <p className="mb-3 text-sm text-gray-500">{total} jobs</p>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Company</th>
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
                  <td className="px-4 py-3 text-gray-500">{job.company_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={job.status === 'active' ? 'success' : job.status === 'draft' ? 'default' : 'danger'}>
                      {job.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{job.views_count}</td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(job.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {job.status === 'active' && (
                        <Button size="sm" variant="secondary" isLoading={acting === job.id} onClick={() => closeJob(job.id)}>
                          Close
                        </Button>
                      )}
                      <Button size="sm" variant="danger" isLoading={acting === job.id} onClick={() => deleteJob(job.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => { setPage(page - 1); fetchJobs(search, page - 1); }}>Prev</Button>
          <span className="self-center text-sm text-gray-500">Page {page}</span>
          <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => { setPage(page + 1); fetchJobs(search, page + 1); }}>Next</Button>
        </div>
      )}
    </div>
  );
}
