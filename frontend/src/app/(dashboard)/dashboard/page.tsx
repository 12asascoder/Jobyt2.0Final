'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Job } from '@/types';
import { API_BASE } from '@/constants';
import {
    BackendJob,
    JobCardGrid,
    SkeletonGrid,
    getJobTypeLabel,
} from '@/components/ui/JobCard';

const AVAILABLE_SKILLS = ['React', 'Figma', 'Python', 'Marketing', 'UI/UX', 'SQL', 'Node.js'];
const WORK_TYPES = ['Remote', 'Hybrid', 'On-site'];
const DURATIONS = ['1-3 Months', '3-6 Months', '6+ Months'];

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [balance, setBalance] = useState(0);
    const [stats, setStats] = useState({ applications: 0, saved: 0 });
    const [loading, setLoading] = useState(true);

    const [jobs, setJobs] = useState<BackendJob[]>([]);
    const [jobsLoading, setJobsLoading] = useState(true);

    // Search & filter state (driven from layout's header, but also local for now)
    const [searchQuery, setSearchQuery] = useState('');
    const [searchActive, setSearchActive] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [selectedWorkType, setSelectedWorkType] = useState('');
    const [selectedDuration, setSelectedDuration] = useState('');

    const fetchStats = useCallback(async () => {
        try {
            const [credit, apps, saved] = await Promise.all([
                api.get<{ balance: number }>('/credits/balance'),
                api.getPaginated<unknown>('/applications/my?limit=1'),
                api.get<unknown[]>('/users/me/saved-jobs'),
            ]);
            setBalance(credit.data.balance);
            setStats({
                applications: apps.pagination.total,
                saved: (saved.data as unknown[]).length,
            });
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchStats().finally(() => setLoading(false));
    }, [fetchStats]);

    useEffect(() => {
        fetch(`${API_BASE}/jobs?limit=20&sort=date`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success && data.data?.length > 0) setJobs(data.data);
                else setJobs([]);
            })
            .catch(() => setJobs([]))
            .finally(() => setJobsLoading(false));
    }, []);

    const toggleSkill = (s: string) =>
        setSelectedSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (
                    !job.title.toLowerCase().includes(q) &&
                    !job.company_name?.toLowerCase().includes(q)
                )
                    return false;
            }
            if (selectedSkills.length > 0) {
                if (!job.skills.some((s) => selectedSkills.includes(s))) return false;
            }
            if (selectedWorkType) {
                const wt = selectedWorkType.toLowerCase();
                const isRemote =
                    job.type === 'remote' || job.location?.toLowerCase().includes('remote');
                if (wt === 'remote' && !isRemote) return false;
                if (wt === 'on-site' && isRemote) return false;
            }
            return true;
        });
    }, [jobs, searchQuery, selectedSkills, selectedWorkType]);

    const userName = user?.email ? user.email.split('@')[0] : 'User';
    const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

    const isSearchMode = searchActive || searchQuery.length > 0;

    const statCards = [
        { value: balance.toLocaleString(), label: 'CREDIT', sublabel: 'BALANCE' },
        { value: stats.applications.toString(), label: 'APPLICATIONS', sublabel: '' },
        { value: stats.saved.toString(), label: 'SAVED JOBS', sublabel: '' },
    ];

    return (
        <div className="max-w-[1400px] mx-auto">
            {/* Welcome + Search bar (inline for search mode) */}
            {!isSearchMode && (
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl lg:text-[42px] font-extrabold text-[#1a1a1a] tracking-tight leading-tight">
                        Welcome back, {displayName}!
                    </h1>
                    <p className="text-slate-500 font-medium text-sm md:text-base mt-1">
                        Here&apos;s your overview for today
                    </p>
                </div>
            )}

            {/* Search mode header */}
            {isSearchMode && (
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search internships..."
                            className="bg-lime-400 rounded-full h-11 px-5 text-sm font-medium text-black placeholder-black/40 outline-none min-w-[200px] sm:min-w-[300px]"
                            autoFocus
                        />
                        <button
                            onClick={() => { setSearchActive(false); setSearchQuery(''); }}
                            className="text-sm text-slate-500 hover:text-slate-800 font-medium"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Stat Cards - dark bg, lime numbers */}
            {!isSearchMode && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    {statCards.map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-[#1a1a1a] rounded-2xl px-7 py-5 flex items-center gap-3"
                        >
                            <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-lime-400">
                                {stat.value}
                            </span>
                            <div className="leading-tight">
                                <span className="text-[10px] md:text-[11px] font-bold text-white/80 uppercase tracking-widest">
                                    {stat.label}
                                </span>
                                {stat.sublabel && (
                                    <span className="block text-[10px] md:text-[11px] font-bold text-white/80 uppercase tracking-widest">
                                        {stat.sublabel}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Search mode: results count + filter + grid */}
            {isSearchMode ? (
                <div>
                    <p className="text-center text-xl md:text-2xl font-bold text-[#1a1a1a] mb-8">
                        {filteredJobs.length} Total Internships Found
                    </p>
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Dark filter sidebar */}
                        <aside className="w-full lg:w-[240px] shrink-0 bg-[#1a1a1a] text-white rounded-[20px] p-6 h-fit shadow-xl">
                            <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lime-400">
                                    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                                    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                                </svg>
                                Filters
                            </h3>

                            {/* Keywords */}
                            <div className="mb-5">
                                <h4 className="text-[11px] text-slate-400 font-medium mb-2 uppercase tracking-wider">Keywords</h4>
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Add keywords"
                                        className="w-full bg-[#2a2a2a] text-white rounded-full py-2 pl-8 pr-3 text-xs outline-none placeholder-slate-500"
                                    />
                                </div>
                            </div>

                            {/* Skills */}
                            <div className="mb-5">
                                <h4 className="text-[11px] text-slate-400 font-medium mb-2 uppercase tracking-wider">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {AVAILABLE_SKILLS.map((s) => (
                                        <button key={s} onClick={() => toggleSkill(s)}
                                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                                                selectedSkills.includes(s) ? 'border-lime-400 text-lime-400' : 'border-white/20 text-slate-300'
                                            }`}
                                        >{s}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Work Type */}
                            <div className="mb-5">
                                <h4 className="text-[11px] text-slate-400 font-medium mb-2 uppercase tracking-wider">Work Type</h4>
                                <div className="flex flex-col gap-1.5">
                                    {WORK_TYPES.map((t) => (
                                        <button key={t} onClick={() => setSelectedWorkType(t === selectedWorkType ? '' : t)}
                                            className={`text-left text-xs transition-colors ${
                                                selectedWorkType === t ? 'text-lime-400 font-semibold' : 'text-slate-400'
                                            }`}
                                        >{t}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <h4 className="text-[11px] text-slate-400 font-medium mb-2 uppercase tracking-wider">Duration</h4>
                                <div className="flex flex-col gap-1.5">
                                    {DURATIONS.map((d) => (
                                        <button key={d} onClick={() => setSelectedDuration(d === selectedDuration ? '' : d)}
                                            className={`text-left text-xs transition-colors ${
                                                selectedDuration === d ? 'text-lime-400 font-semibold' : 'text-slate-400'
                                            }`}
                                        >{d}</button>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        {/* Job cards grid */}
                        <div className="flex-1 min-w-0">
                            {jobsLoading ? (
                                <SkeletonGrid count={6} gridClass="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
                            ) : (
                                <JobCardGrid jobs={filteredJobs} gridClass="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* Normal mode: Latest Job Openings */
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-[#1a1a1a] tracking-tight mb-8">
                        Latest Job Openings
                    </h2>
                    {jobsLoading ? (
                        <SkeletonGrid count={8} gridClass="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
                    ) : filteredJobs.length > 0 ? (
                        <JobCardGrid jobs={filteredJobs} gridClass="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
                    ) : (
                        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                            <p className="text-2xl mb-2">🚀</p>
                            <p className="text-slate-500 font-medium text-lg">New opportunities coming soon</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
