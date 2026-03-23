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

import { ApplicationTimeline } from '@/components/applications/ApplicationTimeline';

export default function JobApplicationsPage() {
  const params = useParams();
  const jobId = params.id as string;
  const { applications, total, isLoading, fetchJobApplications, updateStatus } = useApplications();
  const [selected, setSelected] = useState<ApplicationWithProfile | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');
  const [timelineAppId, setTimelineAppId] = useState<string | null>(null);

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
          <h1 className="text-2xl font-bold text-gray-900">Application Pipeline</h1>
          <p className="text-sm text-gray-400">Drag and drop candidates to update their stage.</p>
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
                <Button size="sm" variant="outline" onClick={() => setTimelineAppId(app.id)}>Timeline</Button>
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

      {/* Timeline Modal */}
      {timelineAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 !m-0">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900">Application Timeline</h3>
              <button onClick={() => setTimelineAppId(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 focus:outline-none">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <ApplicationTimeline applicationId={timelineAppId} />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setTimelineAppId(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
