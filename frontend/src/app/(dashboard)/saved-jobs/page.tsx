'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Job } from '@/types';
import { JobCard } from '@/components/jobs/JobCard';
import { Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';

export default function SavedJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Job[]>('/users/me/saved-jobs')
      .then((res) => setJobs(res.data))
      .finally(() => setLoading(false));
  }, []);

  const unsave = async (jobId: string) => {
    await api.delete(`/users/me/saved-jobs/${jobId}`);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Saved Jobs</h1>

      {jobs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-400 mb-4">You haven&apos;t saved any jobs yet.</p>
          <Link href={ROUTES.jobs}>
            <Button>Browse Jobs</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              actions={
                <div className="flex gap-2">
                  <Link href={ROUTES.jobDetail(job.id)}>
                    <Button size="sm">View</Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => unsave(job.id)}>
                    Remove
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
