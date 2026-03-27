'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Job, JobType } from '@/types';
import { Button, Input, Card, CardBody, Spinner, Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FaRobot } from 'react-icons/fa6';
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

  const [showQsModal, setShowQsModal] = useState(false);
  const [generatingQs, setGeneratingQs] = useState(false);
  const [questions, setQuestions] = useState<string[] | null>(null);

  const handleGenerateQs = async () => {
    try {
      setGeneratingQs(true);
      setShowQsModal(true);
      const res = await api.post<any>('/jobs/interview-questions', {
        role: job?.title,
        skills: job?.skills
      });
      setQuestions(res.data.questions);
    } catch (err) {
      toast.error('Failed to generate interview questions');
      setShowQsModal(false);
    } finally {
      setGeneratingQs(false);
    }
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
          ) : questions && questions.length > 0 ? (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {questions.map((q, idx) => (
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
