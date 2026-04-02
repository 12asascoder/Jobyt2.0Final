'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { ApplicationQuestion, Job, JobType } from '@/types';
import { Button, Input, Card, CardBody, Spinner, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import { ROUTES, JOB_TYPES } from '@/constants';
import { InsufficientCreditsCard } from '@/components/credits/InsufficientCreditsCard';

export default function RecruiterJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [creditError, setCreditError] = useState<{ required: number; available: number } | null>(null);
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);
  const updateQuestion = (index: number, updates: Partial<ApplicationQuestion>) => {
    setQuestions((prev) => prev.map((question, idx) => (idx === index ? { ...question, ...updates } : question)));
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: '',
        type: 'text',
        required: false,
        section: '',
        placeholder: '',
        options: [],
      },
    ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((question) => question.id !== id));
  };

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
        const payload = res.data;
        if (!payload) return;
        setJob(payload);
        setForm({
          title: payload.title,
          location: payload.location ?? '',
          type: payload.type,
          salary_min: payload.salary_min?.toString() ?? '',
          salary_max: payload.salary_max?.toString() ?? '',
          description: payload.description,
          skills: payload.skills.join(', '),
        });
        setQuestions(Array.isArray(payload.application_questions) ? payload.application_questions : []);
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
        application_questions: questions
          .map((question) => ({
            ...question,
            label: question.label.trim(),
            section: question.section?.trim() || undefined,
            placeholder: question.placeholder?.trim() || undefined,
            options: (question.options || [])
              .map((option) => option.trim())
              .filter(Boolean),
          }))
          .filter((question) => question.label.length > 0),
      };
      const res = await api.put<Job>(`/jobs/${jobId}`, payload);
      if (res.data) {
        setJob(res.data);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setCreditError(null);
    try {
      await api.patch(`/jobs/${jobId}/publish`, {});
      setJob((prev) => prev ? { ...prev, status: 'active' } : prev);
    } catch (err) {
      if (err instanceof ApiError) {
        const creditData = err.data as
          | { code?: string; required?: number; available?: number; requiredCredits?: number; availableCredits?: number }
          | undefined;

        const isInsufficient =
          err.status === 402 ||
          creditData?.code === 'INSUFFICIENT_CREDITS' ||
          err.code === 'INSUFFICIENT_CREDITS';

        if (isInsufficient) {
          setCreditError({
            required: creditData?.required ?? creditData?.requiredCredits ?? 10,
            available: creditData?.available ?? creditData?.availableCredits ?? 0,
          });
        } else {
          setError(err.message || 'Publish failed');
        }
      } else {
        setError('Publish failed');
      }
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!job) return <p className="text-center text-gray-500">Job not found.</p>;

  const primaryStatusLabel = job.job_approval_status === 'pending_approval'
    ? 'under review'
    : job.job_approval_status === 'rejected'
      ? 'rejected'
      : job.status;

  const canPublish = job.status === 'draft' && (!job.job_approval_status || job.job_approval_status === 'approved');

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={job.status === 'active' ? 'success' : primaryStatusLabel === 'under review' ? 'warning' : primaryStatusLabel === 'rejected' ? 'danger' : 'default'}>
              {primaryStatusLabel}
            </Badge>
            <span className="text-sm text-gray-400">{job.views_count} views</span>
          </div>

          {job.job_approval_status === 'pending_approval' && (
            <div className="mt-3 rounded-lg border border-lime-300/40 bg-black p-3">
              <p className="text-sm font-semibold text-lime-300">
                This job is under admin review and is not visible to applicants yet.
              </p>
            </div>
          )}

          {job.job_approval_status === 'rejected' && (
            <div className="mt-3 rounded-lg border border-lime-300/40 bg-black p-3">
              <p className="text-sm font-semibold text-lime-300">
                This job was rejected by admin. Update details and resubmit for review.
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`${ROUTES.recruiterApplications}?jobId=${encodeURIComponent(jobId)}`}>
            <Button variant="outline" size="sm">View Applications</Button>
          </Link>
          {canPublish && (
            <Button size="sm" isLoading={publishing} onClick={handlePublish}>
              Submit For Review
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardBody className="p-6">
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          {creditError && (
            <div className="mb-4">
              <InsufficientCreditsCard
                creditError={creditError}
                onViewCredits={() => router.push(ROUTES.recruiterCredits)}
                onRetry={() => {
                  void handlePublish();
                }}
                retryDisabled={publishing}
              />
            </div>
          )}
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

            <div className="rounded-xl border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Application Questions</p>
                  <p className="text-xs text-gray-500">Edit what candidates need to answer when they apply.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>Add Question</Button>
              </div>

              {questions.length === 0 && (
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  No custom questions configured.
                </div>
              )}

              {questions.map((question, index) => (
                <div key={question.id} className="rounded-lg border border-gray-200 p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Question"
                      value={question.label}
                      onChange={(e) => updateQuestion(index, { label: e.target.value })}
                      placeholder="e.g. Share a portfolio project relevant to this role"
                    />
                    <Input
                      label="Section (optional)"
                      value={question.section || ''}
                      onChange={(e) => updateQuestion(index, { section: e.target.value })}
                      placeholder="e.g. Projects"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestion(index, { type: e.target.value as ApplicationQuestion['type'] })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="link">Portfolio/Link</option>
                        <option value="select">Select</option>
                        <option value="rating">Rating</option>
                      </select>
                    </div>
                    <Input
                      label="Placeholder (optional)"
                      value={question.placeholder || ''}
                      onChange={(e) => updateQuestion(index, { placeholder: e.target.value })}
                      placeholder="Optional helper text"
                    />
                  </div>

                  {(question.type === 'select' || question.type === 'rating') && (
                    <Input
                      label="Options (comma separated)"
                      value={(question.options || []).join(', ')}
                      onChange={(e) =>
                        updateQuestion(index, {
                          options: e.target.value.split(',').map((option) => option.trim()).filter(Boolean),
                        })
                      }
                      placeholder={question.type === 'rating' ? '1, 2, 3, 4, 5' : 'Option A, Option B'}
                    />
                  )}

                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Required
                    </label>
                    <Button type="button" variant="outline" size="sm" onClick={() => removeQuestion(question.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
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
