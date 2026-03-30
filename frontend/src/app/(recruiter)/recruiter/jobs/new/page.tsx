'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { ApplicationQuestion, Job, JobType } from '@/types';
import { Button, Input, Card, CardBody } from '@/components/ui';
import { ROUTES, JOB_TYPES } from '@/constants';
import { InsufficientCreditsCard } from '@/components/credits/InsufficientCreditsCard';

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

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submitJob = async () => {
    setError('');
    setCreditError(null);
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
        publish: form.publish,
      };
      const res = await api.post<Job>('/jobs', payload);
      router.push(ROUTES.recruiterJobDetail(res.data.id));
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
          setError(err.message || 'Failed to create job');
        }
      } else {
        setError('Failed to create job');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitJob();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Post a New Job</h1>

      <Card>
        <CardBody className="p-6">
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          {creditError && (
            <div className="mb-4">
              <InsufficientCreditsCard
                creditError={creditError}
                onViewCredits={() => router.push(ROUTES.recruiterCredits)}
                onRetry={() => {
                  void submitJob();
                }}
                retryDisabled={loading}
              />
            </div>
          )}

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

            <div className="rounded-xl border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Application Questions</p>
                  <p className="text-xs text-gray-500">Create structured questions for candidates. Leave empty to allow quick apply.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>Add Question</Button>
              </div>

              {questions.length === 0 && (
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  No custom questions yet.
                </div>
              )}

              {questions.map((question, index) => (
                <div key={question.id} className="rounded-lg border border-gray-200 p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Question"
                      value={question.label}
                      onChange={(e) => updateQuestion(index, { label: e.target.value })}
                      placeholder="e.g. Share one project where you scaled APIs"
                    />
                    <Input
                      label="Section (optional)"
                      value={question.section || ''}
                      onChange={(e) => updateQuestion(index, { section: e.target.value })}
                      placeholder="e.g. Experience"
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
