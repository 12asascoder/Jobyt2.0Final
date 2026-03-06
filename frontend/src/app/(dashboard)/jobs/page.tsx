'use client';

import { useEffect } from 'react';
import { JobCard } from '@/components/jobs/JobCard';
import { JobFilters } from '@/components/jobs/JobFilters';
import { Spinner, Button } from '@/components/ui';
import { useJobs } from '@/hooks/useJobs';

export default function JobsPage() {
  const { jobs, total, isLoading, searchJobs } = useJobs();

  useEffect(() => { searchJobs(); }, [searchJobs]);

  return (
    <div className="flex gap-6">
      <div className="w-64 shrink-0">
        <JobFilters onApply={searchJobs} />
      </div>

      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            {total > 0 ? `${total} jobs found` : 'Find Jobs'}
          </h1>
        </div>

        {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}

        {!isLoading && jobs.length === 0 && (
          <div className="py-12 text-center text-gray-400">No jobs match your search.</div>
        )}

        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} actions={<Button size="sm">Apply Now</Button>} />
          ))}
        </div>
      </div>
    </div>
  );
}
