'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Job, JobType } from '@/types';
import { Button, Input, Card, CardBody, Spinner, Badge } from '@/components/ui';
import { ROUTES, JOB_TYPES } from '@/constants';

export default function RecruiterJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    location: '',
    type: 'full-time' as JobType,
    salary_min: '',
    salary_max: '',
    description: '',
    skills: '',
  });

  useEffect(() => {
    api.get<Job>(`/jobs/${jobId}`)
      .then((res) => {
        setJob(res.data);
        setForm({
          title: res.data.title,
          location: res.data.location ?? '',
          type: res.data.type,
          salary_min: res.data.salary_min?.toString() ?? '',
          salary_max: res.data.salary_max?.toString() ?? '',
          description: res.data.description,
          skills: res.data.skills.join(', '),
        });
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        location: form.location || undefined,
        type: form.type,
        salary_min: form.salary_min ? Number(form.salary_min) : undefined,
        salary_max: form.salary_max ? Number(form.salary_max) : undefined,
        description: form.description,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const res = await api.put<Job>(`/jobs/${jobId}`, payload);
      setJob(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await api.patch(`/jobs/${jobId}/publish`, {});
      setJob((prev) => prev ? { ...prev, status: 'active' } : prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!job) return <p className="text-center text-gray-500">Job not found.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={job.status === 'active' ? 'success' : job.status === 'draft' ? 'default' : 'danger'}>
              {job.status}
            </Badge>
            <span className="text-sm text-gray-400">{job.views_count} views</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={ROUTES.recruiterJobApplications(jobId)}>
            <Button variant="outline" size="sm">View Applications</Button>
          </Link>
          {job.status === 'draft' && (
            <Button size="sm" isLoading={publishing} onClick={handlePublish}>
              Publish (10 credits)
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardBody className="p-6">
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Job Title *" value={form.title} onChange={(e) => set('title', e.target.value)} required />

            <div className="grid grid-cols-2 gap-4">
              <Input label="Location" value={form.location} onChange={(e) => set('location', e.target.value)} />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Job Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Min Salary" type="number" value={form.salary_min} onChange={(e) => set('salary_min', e.target.value)} />
              <Input label="Max Salary" type="number" value={form.salary_max} onChange={(e) => set('salary_max', e.target.value)} />
            </div>

            <Input label="Skills (comma separated)" value={form.skills} onChange={(e) => set('skills', e.target.value)} />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={8}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" isLoading={saving} className="flex-1">Save Changes</Button>
              <Button type="button" variant="outline" onClick={() => router.push(ROUTES.recruiterJobs)}>Back</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
