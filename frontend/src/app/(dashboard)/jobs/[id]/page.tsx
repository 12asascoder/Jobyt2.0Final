'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Job } from '@/types';
import { Badge, Button, Card, CardBody, Spinner } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { formatSalaryRange, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ROUTES } from '@/constants';
import Link from 'next/link';

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Job>(`/jobs/${params.id}`),
      api.get<{ hasApplied: boolean }>(`/applications/jobs/${params.id}/check`).catch(() => ({ data: { hasApplied: false } }))
    ])
      .then(([jobRes, checkRes]) => {
        setJob(jobRes.data);
        setHasApplied(checkRes.data.hasApplied);
      })
      .catch(() => router.push(ROUTES.jobs))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await api.post(`/applications/jobs/${params.id}`, { cover_letter: coverLetter });
      toast.success('Application submitted!');
      setHasApplied(true);
      setShowModal(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!job) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={ROUTES.jobs} className="hover:text-blue-600">Jobs</Link>
        <span>/</span>
        <span className="text-gray-900">{job.title}</span>
      </div>

      <Card>
        <CardBody className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
              {job.company_name && <p className="mt-1 text-gray-600">{job.company_name}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {job.location && <span className="text-sm text-gray-500">📍 {job.location}</span>}
                <Badge>{job.type}</Badge>
                {job.is_boosted && <Badge variant="warning">⚡ Featured</Badge>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">{formatSalaryRange(job.salary_min, job.salary_max)}</p>
              <p className="mt-1 text-xs text-gray-400">Posted {formatDate(job.created_at)}</p>
            </div>
          </div>

          {job.skills.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Required Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((s) => <Badge key={s} variant="info">{s}</Badge>)}
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-gray-700">Job Description</p>
            <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">{job.description}</div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button onClick={() => setShowModal(true)} disabled={hasApplied} className="flex-1">
              {hasApplied ? 'Already Applied' : 'Apply Now'}
            </Button>
            <Button variant="outline" onClick={() => {
              api.post(`/users/me/saved-jobs/${job.id}`, {}).then(() => toast.success('Job saved!')).catch(() => toast.error('Already saved'));
            }}>🔖 Save</Button>
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Apply for this position">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Applying to: <strong>{job.title}</strong>{job.company_name ? ` at ${job.company_name}` : ''}</p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Cover Letter <span className="text-gray-400">(optional)</span></label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={5}
              placeholder="Tell the recruiter why you're a great fit..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleApply} isLoading={applying} className="flex-1">Submit Application</Button>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
