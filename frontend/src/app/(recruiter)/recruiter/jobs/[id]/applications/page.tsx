'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Application, ApplicationStatus } from '@/types';
import { useApplications } from '@/hooks/useApplications';
import { Button, Spinner, Badge, Avatar } from '@/components/ui';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS, APPLICATION_STATUSES } from '@/constants';
import { formatDate } from '@/lib/utils';

interface ApplicantProfile {
  name: string | null;
  photo_url: string | null;
  skills: string[];
  resume_url: string | null;
}

interface ApplicationWithProfile extends Application {
  profile?: ApplicantProfile;
}

export default function JobApplicationsPage() {
  const params = useParams();
  const jobId = params.id as string;
  const { applications, total, isLoading, fetchJobApplications, updateStatus } = useApplications();
  const [selected, setSelected] = useState<ApplicationWithProfile | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');

  useEffect(() => {
    fetchJobApplications(jobId);
  }, [jobId, fetchJobApplications]);

  const filtered = filter === 'all' ? applications : applications.filter((a) => a.status === filter);

  const handleStatusChange = async (appId: string, status: ApplicationStatus) => {
    await updateStatus(appId, status);
    if (selected?.id === appId) setSelected((prev) => prev ? { ...prev, status } : prev);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-400">{total} total applications</p>
        </div>
        <Link href={`/recruiter/jobs/${jobId}`}>
          <Button variant="outline" size="sm">← Back to Job</Button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All ({applications.length})
        </button>
        {APPLICATION_STATUSES.map((s) => {
          const count = applications.filter((a) => a.status === s).length;
          if (count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {APPLICATION_STATUS_LABELS[s]} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-gray-400">No applications in this category.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <div key={app.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar name={app.company_name ?? 'A'} size="sm" />
                <div>
                  <p className="font-medium text-gray-900">{app.company_name ?? 'Applicant'}</p>
                  <p className="text-xs text-gray-400">Applied {formatDate(app.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${APPLICATION_STATUS_COLORS[app.status]}`}>
                  {APPLICATION_STATUS_LABELS[app.status]}
                </span>
                <select
                  value={app.status}
                  onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>
                  ))}
                </select>
                {app.resume_snapshot_url && (
                  <a href={app.resume_snapshot_url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">Resume</Button>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
