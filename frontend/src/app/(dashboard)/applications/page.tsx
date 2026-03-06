'use client';

import { useEffect } from 'react';
import { ApplicationCard } from '@/components/applications/ApplicationCard';
import { Spinner } from '@/components/ui';
import { useApplications } from '@/hooks/useApplications';

export default function ApplicationsPage() {
  const { applications, isLoading, fetchMyApplications } = useApplications();

  useEffect(() => { fetchMyApplications(); }, [fetchMyApplications]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Applications</h1>
      {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
      {!isLoading && applications.length === 0 && (
        <p className="py-12 text-center text-gray-400">You haven&apos;t applied to any jobs yet.</p>
      )}
      <div className="flex flex-col gap-3">
        {applications.map((app) => <ApplicationCard key={app.id} application={app} />)}
      </div>
    </div>
  );
}
