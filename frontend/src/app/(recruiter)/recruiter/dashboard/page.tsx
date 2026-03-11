'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Spinner, Button, Badge } from '@/components/ui';
import { ROUTES } from '@/constants';
import { Job } from '@/types';
import {
    FaWallet,
    FaBriefcase,
    FaFileLines,
    FaClock,
    FaPlus,
    FaChartLine,
    FaArrowRight,
    FaLocationDot,
    FaEye,
} from 'react-icons/fa6';

interface RecruiterSummary {
    total_jobs: number;
    active_jobs: number;
    total_applications: number;
    pending_applications: number;
}

export default function RecruiterDashboardPage() {
    const { user } = useAuthStore();
    const [balance, setBalance] = useState(0);
    const [summary, setSummary] = useState<RecruiterSummary | null>(null);
    const [recentJobs, setRecentJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [credit, sumRes, jobsRes] = await Promise.all([
                api.get<{ balance: number }>('/credits/balance'),
                api.get<RecruiterSummary>('/analytics/summary'),
                api.getPaginated<Job>('/jobs/my/listings?limit=4'),
            ]);
            setBalance(credit.data.balance);
            setSummary(sumRes.data);
            setRecentJobs(jobsRes.data);
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
            label: 'Active Jobs',
            value: (summary?.active_jobs ?? 0).toString(),
            icon: FaBriefcase,
            gradient: 'from-emerald-500 to-green-600',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-600',
        },
        {
            label: 'Total Applications',
            value: (summary?.total_applications ?? 0).toString(),
            icon: FaFileLines,
            gradient: 'from-violet-500 to-purple-600',
            bgLight: 'bg-violet-50',
            textColor: 'text-violet-600',
        },
        {
            label: 'Pending Review',
            value: (summary?.pending_applications ?? 0).toString(),
            icon: FaClock,
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
                    Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
                </h1>
                <p className="text-slate-500 mt-1">Here&apos;s your recruiting overview</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                        <FaBriefcase className="text-brand-primary" />
                        Your Job Listings
                    </h2>
                    <Link href={ROUTES.recruiterJobs} className="text-sm font-semibold text-brand-primary hover:underline flex items-center gap-1">
                        View all <FaArrowRight className="text-xs" />
                    </Link>
                </div>

                {recentJobs.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center">
                        <p className="text-slate-400 mb-3">No jobs posted yet.</p>
                        <Link href={ROUTES.recruiterNewJob}>
                            <Button>Post Your First Job</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentJobs.map((job) => (
                            <div
                                key={job.id}
                                className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-brand-primary hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-slate-900">{job.title}</h3>
                                            <Badge variant={job.status === 'active' ? 'success' : job.status === 'draft' ? 'default' : 'danger'}>
                                                {job.status}
                                            </Badge>
                                        </div>
                                        <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <FaLocationDot className="text-xs text-slate-400" />
                                                {job.location || 'Remote'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FaEye className="text-xs text-slate-400" />
                                                {job.views_count} views
                                            </span>
                                        </div>
                                    </div>
                                    <Link href={ROUTES.recruiterJobApplications(job.id)}>
                                        <Button size="sm" variant="outline">Applications</Button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
                <Link href={ROUTES.recruiterNewJob}>
                    <Button className="flex items-center gap-2">
                        <FaPlus className="text-sm" /> Post New Job
                    </Button>
                </Link>
                <Link href={ROUTES.recruiterAnalytics}>
                    <Button variant="outline" className="flex items-center gap-2">
                        <FaChartLine className="text-sm" /> View Analytics
                    </Button>
                </Link>
            </div>
        </div>
    );
}
