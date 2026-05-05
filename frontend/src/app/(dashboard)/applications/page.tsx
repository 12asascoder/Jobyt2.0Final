'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApplications } from '@/hooks/useApplications';
import { APPLICATION_STATUS_LABELS } from '@/constants';
import { FaArrowUpRightFromSquare, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

type ApplicationView = {
    company_name?: string;
    job_title?: string;
    status_updated_at?: string;
};

const STATUS_STYLES: Record<string, string> = {
    applied: 'bg-blue-100 text-blue-700',
    in_review: 'bg-yellow-100 text-yellow-700',
    shortlisted: 'bg-purple-100 text-purple-700',
    interview: 'bg-sky-100 text-sky-700',
    offer: 'bg-emerald-100 text-emerald-700',
    hired: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
};

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear().toString().slice(-2);
    return `${day} ${month}' ${year}`;
}

function formatRelative(dateStr: string): string {
    const now = Date.now();
    const time = new Date(dateStr).getTime();
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
    if (days < 30) return `${days}d ago`;
    return formatDate(dateStr);
}

export default function ApplicationsPage() {
    const router = useRouter();
    const {
        applications, isLoading, page, totalPages, total,
        fetchMyApplications, goToPage,
    } = useApplications();

    useEffect(() => {
        fetchMyApplications(1);
    }, [fetchMyApplications]);

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                pages.push(i);
            }
            if (page < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="max-w-[1400px] ml-4 sm:ml-6 lg:ml-8 pr-4">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] tracking-tight">
                    My Applications
                </h1>
                {!isLoading && total > 0 && (
                    <span className="text-sm text-slate-500 font-medium">
                        {total} application{total !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {isLoading && (
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="animate-pulse bg-[#F4F1EA]/60 rounded-2xl h-20" />
                    ))}
                </div>
            )}

            {!isLoading && applications.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                    <p className="text-slate-500 font-medium text-lg">You haven&apos;t applied to any jobs yet.</p>
                    <p className="text-slate-400 text-sm mt-1">Start exploring opportunities!</p>
                </div>
            )}

            {!isLoading && applications.length > 0 && (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        {/* Table Header */}
                        <div className="bg-[#1a1a1a] text-white rounded-2xl px-6 py-4 mb-3">
                            <div className="grid grid-cols-10 gap-3 text-[11px] font-bold uppercase tracking-widest">
                                <div className="col-span-2">Company</div>
                                <div className="col-span-2">Profile</div>
                                <div className="col-span-2">Applied On</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-1 text-center">View</div>
                                <div className="col-span-1">Last Updated</div>
                            </div>
                        </div>

                        {/* Table Rows */}
                        <div className="space-y-2.5">
                            {applications.map((app) => {
                                const view = app as typeof app & ApplicationView;
                                return (
                                    <div
                                        key={app.id}
                                        className="bg-white border border-[#e8e4dc] rounded-2xl px-6 py-5 hover:shadow-md transition-shadow"
                                    >
                                        <div className="grid grid-cols-10 gap-3 items-center">
                                            <div className="col-span-2">
                                                <span className="text-sm font-semibold text-[#1a1a1a]">
                                                    {view.company_name || 'Company'}
                                                </span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-sm text-slate-600">
                                                    {view.job_title || 'Position'}
                                                </span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-sm text-slate-500">
                                                    {formatDate(app.created_at)}
                                                </span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[app.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {APPLICATION_STATUS_LABELS[app.status] || app.status}
                                                </span>
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                <button
                                                    onClick={() => router.push(`/jobs/${app.job_id}`)}
                                                    className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-[#e8e4dc] flex items-center justify-center transition-colors"
                                                    aria-label="Open job details"
                                                >
                                                    <FaArrowUpRightFromSquare className="text-xs text-[#1a1a1a]" />
                                                </button>
                                            </div>
                                            <div className="col-span-1">
                                                <span className="text-xs text-slate-400">
                                                    {view.status_updated_at
                                                        ? formatRelative(view.status_updated_at)
                                                        : formatRelative(app.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {applications.map((app) => {
                            const view = app as typeof app & ApplicationView;
                            return (
                                <div
                                    key={app.id}
                                    className="bg-white border border-[#e8e4dc] rounded-2xl p-5"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="text-sm font-bold text-[#1a1a1a]">
                                                {view.company_name || 'Company'}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {view.job_title || 'Position'}
                                            </p>
                                        </div>
                                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold ${STATUS_STYLES[app.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {APPLICATION_STATUS_LABELS[app.status] || app.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400">
                                            Applied {formatDate(app.created_at)}
                                        </span>
                                        <button
                                            onClick={() => router.push(`/jobs/${app.job_id}`)}
                                            className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center"
                                            aria-label="Open job details"
                                        >
                                            <FaArrowUpRightFromSquare className="text-[10px] text-[#1a1a1a]" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="mt-8 flex items-center justify-center gap-2">
                            <button
                                onClick={() => goToPage(page - 1)}
                                disabled={page <= 1}
                                className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-[#e8e4dc] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Previous page"
                            >
                                <FaChevronLeft className="text-xs text-[#1a1a1a]" />
                            </button>

                            {getPageNumbers().map((p, i) =>
                                p === '...' ? (
                                    <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-slate-400">
                                        …
                                    </span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => goToPage(p as number)}
                                        className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${p === page
                                                ? 'bg-[#1a1a1a] text-white'
                                                : 'bg-[#f4f1ea] text-[#1a1a1a] hover:bg-[#e8e4dc]'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                )
                            )}

                            <button
                                onClick={() => goToPage(page + 1)}
                                disabled={page >= totalPages}
                                className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-[#e8e4dc] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Next page"
                            >
                                <FaChevronRight className="text-xs text-[#1a1a1a]" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
