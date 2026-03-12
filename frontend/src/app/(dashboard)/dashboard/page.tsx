'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Spinner, Button } from '@/components/ui';
import { ROUTES } from '@/constants';
import { Job } from '@/types';
import { formatSalaryRange, formatDate } from '@/lib/utils';
import {
    FaWallet,
    FaFileLines,
    FaBookmark,
    FaBriefcase,
    FaLocationDot,
    FaArrowRight,
    FaArrowTrendUp,
} from 'react-icons/fa6';

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [balance, setBalance] = useState(0);
    const [recentJobs, setRecentJobs] = useState<Job[]>([]);
    const [stats, setStats] = useState({ applications: 0, saved: 0 });
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [credit, jobs, apps, saved] = await Promise.all([
                api.get<{ balance: number }>('/credits/balance'),
                api.getPaginated<Job>('/jobs?limit=4&sort=date'),
                api.getPaginated<unknown>('/applications/my?limit=1'),
                api.get<unknown[]>('/users/me/saved-jobs'),
            ]);
            setBalance(credit.data.balance);
            setRecentJobs(jobs.data);
            setStats({ applications: apps.pagination.total, saved: (saved.data as unknown[]).length });
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchData().finally(() => setLoading(false));
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
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
            label: 'Credit Balance',
            value: balance.toLocaleString(),
            icon: FaWallet,
            gradient: 'from-blue-500 to-blue-600',
            bgLight: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            label: 'Applications',
            value: stats.applications.toString(),
            icon: FaFileLines,
            gradient: 'from-violet-500 to-purple-600',
            bgLight: 'bg-violet-50',
            textColor: 'text-violet-600',
        },
        {
            label: 'Saved Jobs',
            value: stats.saved.toString(),
            icon: FaBookmark,
            gradient: 'from-amber-500 to-orange-500',
            bgLight: 'bg-amber-50',
            textColor: 'text-amber-600',
        },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Welcome */}
            <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! 👋
                </h1>
                <p className="text-slate-500 mt-1">Here&apos;s your overview for today</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow group"
                        >
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full -translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform`} />
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl ${stat.bgLight} flex items-center justify-center`}>
                                    <Icon className={`text-xl ${stat.textColor}`} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        {stat.label}
                                    </p>
                                    <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
                                        {stat.value}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Job Listings */}
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FaArrowTrendUp className="text-brand-primary" />
                        Latest Job Openings
                    </h2>
                    <Link href={ROUTES.jobs} className="text-sm font-semibold text-brand-primary hover:underline flex items-center gap-1">
                        View all <FaArrowRight className="text-xs" />
                    </Link>
                </div>
                <div className="space-y-3">
                    {recentJobs.map((job) => (
                        <Link
                            key={job.id}
                            href={ROUTES.jobDetail(job.id)}
                            className="block bg-white rounded-2xl border border-slate-100 p-5 hover:border-brand-primary hover:shadow-md transition-all group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-brand-primary font-bold text-sm shrink-0">
                                            {(job.company_name || 'J')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 group-hover:text-brand-primary transition-colors">
                                                {job.title}
                                            </h3>
                                            {job.company_name && (
                                                <p className="text-sm text-slate-500">{job.company_name}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                        {job.location && (
                                            <span className="flex items-center gap-1">
                                                <FaLocationDot className="text-xs text-slate-400" />
                                                {job.location}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 capitalize">
                                            <FaBriefcase className="text-[10px]" />
                                            {job.type}
                                        </span>
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="font-bold text-slate-900">{formatSalaryRange(job.salary_min, job.salary_max)}</p>
                                    <p className="text-xs text-slate-400 mt-1">{formatDate(job.created_at)}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {recentJobs.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center">
                            <p className="text-slate-400 mb-3">No jobs found yet.</p>
                            <Link href={ROUTES.jobs}>
                                <Button>Browse Jobs</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
