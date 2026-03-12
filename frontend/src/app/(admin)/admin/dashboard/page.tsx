'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import {
    FaUsers,
    FaUserGraduate,
    FaBuilding,
    FaBriefcase,
    FaFileLines,
    FaSackDollar,
    FaChartLine,
} from 'react-icons/fa6';

interface PlatformMetrics {
    total_users: number;
    total_applicants: number;
    total_recruiters: number;
    active_jobs: number;
    total_applications: number;
    total_revenue: number;
}

interface DailyStat {
    date: string;
    new_users: number;
    new_jobs: number;
    new_applications: number;
}

interface MetricsResponse {
    metrics: PlatformMetrics;
    daily_stats: DailyStat[];
}

export default function AdminDashboardPage() {
    const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
    const [daily, setDaily] = useState<DailyStat[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const res = await api.get<MetricsResponse>('/admin/metrics');
            setMetrics(res.data.metrics);
            setDaily(res.data.daily_stats ?? []);
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
            label: 'Total Users',
            value: (metrics?.total_users ?? 0).toLocaleString(),
            icon: FaUsers,
            gradient: 'from-blue-500 to-blue-600',
            bgLight: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            label: 'Applicants',
            value: (metrics?.total_applicants ?? 0).toLocaleString(),
            icon: FaUserGraduate,
            gradient: 'from-cyan-500 to-teal-600',
            bgLight: 'bg-cyan-50',
            textColor: 'text-cyan-600',
        },
        {
            label: 'Recruiters',
            value: (metrics?.total_recruiters ?? 0).toLocaleString(),
            icon: FaBuilding,
            gradient: 'from-indigo-500 to-violet-600',
            bgLight: 'bg-indigo-50',
            textColor: 'text-indigo-600',
        },
        {
            label: 'Active Jobs',
            value: (metrics?.active_jobs ?? 0).toLocaleString(),
            icon: FaBriefcase,
            gradient: 'from-emerald-500 to-green-600',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-600',
        },
        {
            label: 'Applications',
            value: (metrics?.total_applications ?? 0).toLocaleString(),
            icon: FaFileLines,
            gradient: 'from-violet-500 to-purple-600',
            bgLight: 'bg-violet-50',
            textColor: 'text-violet-600',
        },
        {
            label: 'Revenue (₹)',
            value: (metrics?.total_revenue ?? 0).toLocaleString(),
            icon: FaSackDollar,
            gradient: 'from-amber-500 to-orange-500',
            bgLight: 'bg-amber-50',
            textColor: 'text-amber-600',
        },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Title */}
            <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Admin Dashboard
                </h1>
                <p className="text-slate-500 mt-1">Platform overview and analytics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

            {/* Daily Activity */}
            {daily.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 pb-4 flex items-center gap-2">
                        <FaChartLine className="text-brand-primary" />
                        <h2 className="font-bold text-slate-900">Daily Activity (Last 7 Days)</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 text-left">Date</th>
                                    <th className="px-6 py-3 text-right">New Users</th>
                                    <th className="px-6 py-3 text-right">New Jobs</th>
                                    <th className="px-6 py-3 text-right">Applications</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {daily.slice(-7).reverse().map((d) => (
                                    <tr key={d.date} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-6 py-3.5 text-slate-600 font-medium">{formatDate(d.date)}</td>
                                        <td className="px-6 py-3.5 text-right">
                                            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-semibold text-xs">
                                                {d.new_users}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-xs">
                                                {d.new_jobs}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700 font-semibold text-xs">
                                                {d.new_applications}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
