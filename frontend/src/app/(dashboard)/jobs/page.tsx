'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { JobCard } from '@/components/jobs/JobCard';
import { JobFilters } from '@/components/jobs/JobFilters';
import { Spinner, Button } from '@/components/ui';
import { useJobs } from '@/hooks/useJobs';
import { FaMagnifyingGlass } from 'react-icons/fa6';

function JobsContent() {
    const searchParams = useSearchParams();
    const { jobs, total, isLoading, isLoadingMore, hasMore, searchJobs, loadMore } = useJobs();

    useEffect(() => {
        const keyword = searchParams.get('keyword') || undefined;
        const type = searchParams.get('type') || undefined;
        searchJobs({ keyword, type, page: 1, limit: 20 });
    }, [searchParams, searchJobs]);

    return (
        <div className="flex gap-6">
            <div className="w-64 shrink-0">
                <JobFilters
                    onApply={searchJobs}
                    initialKeyword={searchParams.get('keyword') || ''}
                    initialType={searchParams.get('type') || ''}
                />
            </div>

            <div className="flex-1">
                <div className="mb-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FaMagnifyingGlass className="text-brand-primary" />
                        {total > 0 ? `${total} jobs found` : 'Find Jobs'}
                    </h1>
                </div>

                {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}

                {!isLoading && jobs.length === 0 && (
                    <div className="py-12 text-center text-slate-400">No jobs match your search.</div>
                )}

                <div className="flex flex-col gap-3">
                    {jobs.map((job) => (
                        <JobCard key={job.id} job={job} actions={<Button size="sm">Apply Now</Button>} />
                    ))}
                </div>

                {!isLoading && jobs.length > 0 && (
                    <div className="mt-6 flex flex-col items-center gap-3">
                        <Button variant="brand" onClick={loadMore} isLoading={isLoadingMore} disabled={isLoadingMore || !hasMore}>
                            {isLoadingMore ? 'Loading more jobs...' : (hasMore ? 'Load more jobs' : 'No more jobs')}
                        </Button>
                        <p className="text-sm text-slate-500">Showing {jobs.length} of {total} jobs</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function JobsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Spinner size="lg" /></div>}>
            <JobsContent />
        </Suspense>
    );
}
