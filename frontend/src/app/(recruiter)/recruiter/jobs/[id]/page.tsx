'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { ApplicationQuestion, Job, JobType } from '@/types';
import { Button, Input, Card, CardBody, Spinner, Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FaRobot } from 'react-icons/fa6';
import { ROUTES, JOB_TYPES } from '@/constants';
import { InsufficientCreditsCard } from '@/components/credits/InsufficientCreditsCard';

interface InterviewQuestionsResponse {
  questions: string[];
}

const normalizeJobTypeForForm = (value: string): JobType => {
  const normalized = value.replace('_', '-').toLowerCase();
  if (
    normalized === 'full-time' ||
    normalized === 'part-time' ||
    normalized === 'contract' ||
    normalized === 'remote' ||
    normalized === 'internship'
  ) {
    return normalized;
  }
  return 'full-time';
};

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

  const [showQsModal, setShowQsModal] = useState(false);
  const [generatingQs, setGeneratingQs] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[] | null>(null);

  const handleGenerateQs = async () => {
    try {
      setGeneratingQs(true);
      setShowQsModal(true);
      const res = await api.post<InterviewQuestionsResponse>('/jobs/interview-questions', {
        role: job?.title,
        skills: job?.skills
      });
      setGeneratedQuestions(res.data.questions);
    } catch (err) {
      toast.error('Failed to generate interview questions');
      setShowQsModal(false);
    } finally {
      setGeneratingQs(false);
    }
  };
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
        setJob(res.data);
        setForm({
          title: res.data.title,
          location: res.data.location ?? '',
          type: normalizeJobTypeForForm(String(res.data.type)),
          salary_min: res.data.salary_min?.toString() ?? '',
          salary_max: res.data.salary_max?.toString() ?? '',
          description: res.data.description,
          skills: res.data.skills.join(', '),
        });
        setQuestions(Array.isArray(res.data.application_questions) ? res.data.application_questions : []);
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
        type: normalizeJobTypeForForm(String(form.type)),
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
      setJob(res.data);
      toast.success('Listing changes saved');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Save failed';
      setError(message);
      toast.error(message);
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

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Edit Listing</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">{job.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={job.status === 'active' ? 'success' : job.status === 'draft' ? 'default' : 'danger'}>
              {job.status}
            </Badge>
            <span className="text-sm text-slate-500">{job.views_count} views</span>
          </div>
        </div>
        <div className="flex gap-2">
          {job.status === 'active' && (
            <Button size="sm" variant="outline" onClick={handleGenerateQs} className="flex items-center gap-2 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
              <FaRobot /> Generate Interview Qs
            </Button>
          )}
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

      <Card className="bg-white border border-slate-200 rounded-2xl shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <CardBody className="p-7">
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
          <form onSubmit={handleSave} className="space-y-5">
            <Input label="Job Title *" value={form.title} onChange={(e) => set('title', e.target.value)} required />

            <div className="grid grid-cols-2 gap-4">
              <Input label="Location" value={form.location} onChange={(e) => set('location', e.target.value)} />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Job Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={8}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Application Questions</p>
                  <p className="text-xs text-slate-500">Edit what candidates need to answer when they apply.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>Add Question</Button>
              </div>

              {questions.length === 0 && (
                <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs text-slate-600">
                  No custom questions configured.
                </div>
              )}

              {questions.map((question, index) => (
                <div key={question.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
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
                      <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestion(index, { type: e.target.value as ApplicationQuestion['type'] })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300"
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

      <Modal isOpen={showQsModal} onClose={() => setShowQsModal(false)} title="AI Interview Questions">
        <div className="space-y-4">
          <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-900 border border-indigo-100 mb-4">
            <p className="font-bold flex items-center gap-2 mb-1"><FaRobot className="text-indigo-600"/> Context-Aware Questions</p>
            <p>Generated dynamically based on the specific skills required for this <b>{job?.title}</b> role.</p>
          </div>
          
          {generatingQs ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-4">
              <Spinner size="lg" />
              <p className="text-gray-500 font-medium text-sm">Drafting technical questions...</p>
            </div>
          ) : generatedQuestions && generatedQuestions.length > 0 ? (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {generatedQuestions.map((q, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-100 rounded-lg p-4 shadow-sm text-sm text-gray-800 leading-relaxed">
                  <span className="font-bold text-indigo-600 mr-2">Q{idx + 1}.</span> {q}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-red-500 py-4">Failed to load questions.</p>
          )}
          
          <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={() => setShowQsModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
