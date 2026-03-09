'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Job, JobType } from '@/types';
import { Button, Input, Card, CardBody } from '@/components/ui';
import { ROUTES, JOB_TYPES } from '@/constants';

export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    location: '',
    type: 'full-time' as JobType,
    salary_min: '',
    salary_max: '',
    description: '',
    skills: '',
    publish: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        location: form.location || undefined,
        type: form.type,
        salary_min: form.salary_min ? Number(form.salary_min) : undefined,
        salary_max: form.salary_max ? Number(form.salary_max) : undefined,
        description: form.description,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        publish: form.publish,
      };
      const res = await api.post<Job>('/jobs', payload);
      router.push(ROUTES.recruiterJobDetail(res.data.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Post a New Job</h1>

      <Card>
        <CardBody className="p-6">
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Job Title *"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Location"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="e.g. New York, NY or Remote"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Job Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  {JOB_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Min Salary (USD)"
                type="number"
                value={form.salary_min}
                onChange={(e) => set('salary_min', e.target.value)}
                placeholder="e.g. 80000"
              />
              <Input
                label="Max Salary (USD)"
                type="number"
                value={form.salary_max}
                onChange={(e) => set('salary_max', e.target.value)}
                placeholder="e.g. 120000"
              />
            </div>

            <Input
              label="Required Skills"
              value={form.skills}
              onChange={(e) => set('skills', e.target.value)}
              placeholder="React, TypeScript, Node.js (comma separated)"
              hint="Separate multiple skills with commas"
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Job Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={8}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Describe the role, responsibilities, requirements..."
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3">
              <input
                type="checkbox"
                id="publish"
                checked={form.publish}
                onChange={(e) => set('publish', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="publish" className="text-sm text-blue-800">
                Publish immediately (costs 10 credits)
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" isLoading={loading} className="flex-1">
                {form.publish ? 'Post & Publish Job' : 'Save as Draft'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
