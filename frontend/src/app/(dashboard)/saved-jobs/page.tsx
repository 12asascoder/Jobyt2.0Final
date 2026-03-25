'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Job } from '@/types';
import { API_BASE } from '@/constants';
import { BackendJob, JobCardGrid, SkeletonGrid } from '@/components/ui/JobCard';
import { FaTrashCan } from 'react-icons/fa6';

export default function SavedJobsPage() {
    const [jobs, setJobs] = useState<BackendJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<Job[]>('/users/me/saved-jobs')
            .then((res) => {
                // Map Job to BackendJob shape for reusable card
                const mapped: BackendJob[] = (res.data || []).map((j: Job) => ({
                    _id: j.id,
                    title: j.title,
                    company_name: j.company_name || '',
                    company_logo: '',
                    location: j.location || '',
                    type: j.type,
                    salary_min: j.salary_min,
                    salary_max: j.salary_max,
                    skills: j.skills || [],
                    status: j.status,
                    created_at: j.created_at,
                }));
                setJobs(mapped);
            })
            .catch(() => setJobs([]))
            .finally(() => setLoading(false));
    }, []);

    const unsave = async (jobId: string) => {
        try {
            await api.delete(`/users/me/saved-jobs/${jobId}`);
            setJobs((prev) => prev.filter((j) => j._id !== jobId));
        } catch { /* silent */ }
    };

    return (
        <div className="max-w-[1400px] mx-auto">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] tracking-tight mb-2">
                Saved Jobs
            </h1>
            <p className="text-slate-500 font-medium text-sm md:text-base mb-8">
                Saved jobs will be automatically removed from here whenever their application deadline is over
            </p>

            {loading ? (
                <SkeletonGrid count={6} gridClass="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
            ) : jobs.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                    <p className="text-2xl mb-2">🔖</p>
                    <p className="text-slate-500 font-medium text-lg">No saved jobs yet</p>
                    <p className="text-slate-400 text-sm mt-1">Browse internships and save the ones you like!</p>
                </div>
            ) : (
                <JobCardGrid jobs={jobs} gridClass="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
            )}
        </div>
    );
}
