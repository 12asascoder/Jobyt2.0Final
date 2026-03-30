'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Spinner, Button } from '@/components/ui';
import { ROUTES } from '@/constants';
import { Job } from '@/types';
import { FaEye, FaBriefcase } from 'react-icons/fa6';

interface RecruiterSummary {
    total_jobs: number;
    active_jobs: number;
    total_applications: number;
    total_hired: number;
    total_views: number;
}

interface RecruiterApplicant {
    id: string;
    name: string | null;
    photo_url?: string | null;
    status: string;
    job_title: string;
    job_location: string | null;
    created_at: string;
}

const statusPillClass: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-600',
    REVIEWED: 'bg-blue-100 text-blue-600',
    INTERVIEWED: 'bg-lime-100 text-lime-600',
    REJECTED: 'bg-rose-100 text-rose-600',
    APPLIED: 'bg-amber-100 text-amber-600',
    SCREENING: 'bg-blue-100 text-blue-600',
    SHORTLISTED: 'bg-blue-100 text-blue-600',
    INTERVIEW: 'bg-lime-100 text-lime-600',
    SELECTED: 'bg-lime-100 text-lime-600',
    HIRED: 'bg-lime-100 text-lime-600',
};

const formatRelative = (isoDate: string) => {
    const now = Date.now();
    const time = new Date(isoDate).getTime();
    const diffMs = now - time;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
        const mins = Math.max(1, Math.floor(diffMs / minute));
        return `${mins}m ago`;
    }
    if (diffMs < day) {
        const hours = Math.floor(diffMs / hour);
        return `${hours}h ago`;
    }
    const days = Math.floor(diffMs / day);
    return `${days}d ago`;
};

const formatStatusLabel = (status: string) => status.replace(/_/g, ' ').toUpperCase();

const getStatusPillClass = (status: string) => {
    const normalized = status.toUpperCase();
    return statusPillClass[normalized] || 'bg-slate-100 text-slate-700';
};

export default function RecruiterDashboardPage() {
    const [balance, setBalance] = useState(0);
    const [summary, setSummary] = useState<RecruiterSummary | null>(null);
    const [activeJobs, setActiveJobs] = useState<Job[]>([]);
    const [recentApplicants, setRecentApplicants] = useState<RecruiterApplicant[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [credit, summaryRes, jobsRes, applicantsRes] = await Promise.all([
                api.get<{ balance: number }>('/credits/balance'),
                api.get<{ summary: RecruiterSummary; top_jobs: Job[] }>('/analytics/summary'),
                api.getPaginated<Job>('/jobs/my/listings?limit=5'),
                api.getPaginated<RecruiterApplicant>('/applications/recruiter/applicants?limit=5'),
            ]);

            setBalance(credit.data?.balance ?? 0);
            setSummary(summaryRes.data?.summary ?? null);
            setActiveJobs(jobsRes.data ?? []);
            setRecentApplicants(applicantsRes.data ?? []);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        }
    }, []);

    useEffect(() => {
        let active = true;

        const load = async () => {
            await fetchData();
            if (active) {
                setLoading(false);
            }
        };

        void load();

        const interval = setInterval(() => {
            void fetchData();
        }, 30000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Spinner size="lg" />
            </div>
        );
    }

    const statCards = [
        {
            label: ['CREDIT', 'BALANCE'],
            value: balance.toLocaleString(),
        },
        {
            label: ['ACTIVE JOBS'],
            value: String(summary?.active_jobs ?? 0),
        },
        {
            label: ['TOTAL', 'APPLICATIONS'],
            value: String(summary?.total_applications ?? 0),
        },
        {
            label: ['TOTAL', 'VIEWS'],
            value: String(summary?.total_views ?? 0),
        },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-5 pb-6">
            <section className="py-2">
                <h1 className="text-2xl font-black tracking-tight text-black">Welcome back!</h1>
                <p className="mt-1 text-lg leading-tight text-black/80">Here's what's happening with your internships</p>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                    <article
                        key={stat.label.join('-')}
                        className="rounded-3xl bg-black text-lime-300 px-6 py-5 shadow-lg min-h-[100px] flex items-center"
                    >
                        <div className="flex items-end gap-4">
                            <p className="text-5xl leading-none font-black tracking-tight">{stat.value}</p>
                            <div className="pb-1">
                                {stat.label.map((line) => (
                                    <p key={line} className="text-xs uppercase tracking-widest font-bold leading-tight">
                                        {line}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </article>
                ))}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <article className="rounded-2xl bg-[#ece9e2] border border-[#e3dfd7] shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900">Recent Applications</h2>
                        <Link href={ROUTES.recruiterApplications} className="text-sm font-semibold bg-black text-white px-4 py-2 rounded-full hover:bg-slate-800">
                            View All
                        </Link>
                    </div>

                    {recentApplicants.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                            <p className="text-sm text-slate-500">No applications yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentApplicants.slice(0, 5).map((application) => (
                                <div
                                    key={application.id}
                                    className="rounded-xl bg-white p-4 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        {application.photo_url ? (
                                            <img
                                                src={application.photo_url}
                                                alt={application.name || 'Candidate'}
                                                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0">
                                                <span className="text-lg font-semibold text-slate-600">
                                                    {(application.name || 'C')[0].toUpperCase()}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900 text-base">{application.name || 'Candidate'}</p>
                                            <p className="text-sm text-slate-600 mt-0.5">{application.job_title}</p>
                                            <p className="text-xs text-slate-500 mt-2">{formatRelative(application.created_at)}</p>
                                        </div>

                                        <span
                                            className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 whitespace-nowrap ${
                                                getStatusPillClass(application.status)
                                            }`}
                                        >
                                            {formatStatusLabel(application.status)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </article>

                <article className="rounded-2xl bg-[#ece9e2] border border-[#e3dfd7] shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900">Active Job Posts</h2>
                        <Link href={ROUTES.recruiterJobs} className="text-sm font-semibold bg-black text-white px-4 py-2 rounded-full hover:bg-slate-800">
                            View All
                        </Link>
                    </div>

                    {activeJobs.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                            <p className="text-sm text-slate-500 mb-3">No jobs posted yet.</p>
                            <Link href={ROUTES.recruiterNewJob}>
                                <Button>Post Your First Job</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeJobs.slice(0, 5).map((job) => (
                                <div key={job.id} className="rounded-xl bg-white p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900 text-base">{job.title}</p>
                                            <div className="mt-2 flex items-center gap-4 text-xs text-slate-600">
                                                <span className="inline-flex items-center gap-1">
                                                    <FaBriefcase className="text-[12px]" />
                                                    {Number(job.application_count ?? 0)} applications
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <FaEye className="text-[12px]" />
                                                    {Number(job.views_count ?? 0)} views
                                                </span>
                                            </div>
                                        </div>

                                        <span className="text-xs text-slate-500 flex-shrink-0 whitespace-nowrap">
                                            {formatRelative(job.created_at)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </article>
            </section>
        </div>
    );
}
