'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Navbar, Footer } from '@/components/landing';
import { BackendJob, JobCardGrid, SkeletonGrid, getJobTypeLabel, normalizeJob } from '@/components/ui/JobCard';
import { API_BASE } from '@/constants';

const AVAILABLE_SKILLS = ['React', 'Figma', 'Python', 'Marketing', 'UI/UX', 'SQL', 'Node.js'];
const WORK_TYPES = ['Remote', 'Hybrid', 'On-site'];
const DURATIONS = ['1-3 Months', '3-6 Months', '6+ Months'];

export default function InternshipsPage() {
    return (
        <Suspense fallback={null}>
            <InternshipsContent />
        </Suspense>
    );
}

function InternshipsContent() {
    const { user, isAuthenticated, initialize } = useAuthStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);

    // Hydrate auth on mount
    useEffect(() => {
        initialize();
        setMounted(true);
    }, [initialize]);

    // Redirect if not authenticated after mount
    useEffect(() => {
        if (mounted && !isAuthenticated) {
            router.push('/login');
        }
    }, [mounted, isAuthenticated, router]);

    const [jobs, setJobs] = useState<BackendJob[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial query params parsing
    const initialKeyword = searchParams.get('keyword') || '';
    const [keyword, setKeyword] = useState(initialKeyword);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [selectedWorkType, setSelectedWorkType] = useState<string>('');
    const [selectedDuration, setSelectedDuration] = useState<string>('');
    const [filterOpen, setFilterOpen] = useState(false);

    useEffect(() => {
        if (!mounted) return;

        fetch(`${API_BASE}/jobs?limit=50&sort=date`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data?.length > 0) {
                    // Normalize all jobs to ensure they have valid id fields
                    const normalizedJobs = data.data.map((job: any) => normalizeJob(job));
                    setJobs(normalizedJobs);
                } else {
                    setJobs([]);
                }
            })
            .catch(() => setJobs([]))
            .finally(() => setLoading(false));
    }, [mounted]);

    const toggleSkill = (skill: string) => {
        setSelectedSkills(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };

    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            // Keyword match (Title or Company)
            if (keyword) {
                const term = keyword.toLowerCase();
                const titleMatch = job.title.toLowerCase().includes(term);
                const companyMatch = job.company_name?.toLowerCase().includes(term);
                if (!titleMatch && !companyMatch) return false;
            }

            // Skills match (Must have at least one of the selected skills if any are selected)
            if (selectedSkills.length > 0) {
                const hasSkill = job.skills.some(s => selectedSkills.includes(s));
                if (!hasSkill) return false;
            }

            // Work Type Match
            if (selectedWorkType) {
                const wt = selectedWorkType.toLowerCase();
                const isRemote = job.type === 'remote' || job.location?.toLowerCase().includes('remote');
                if (wt === 'remote' && !isRemote) return false;
                if (wt === 'on-site' && isRemote) return false;
                // Hybrid might need specific db tags, assume standard parsing
            }

            // Duration match (mock parsing, assumes DB structure maps string durations to skills or tags)
            // if (selectedDuration) { ... }
            return true;
        });
    }, [jobs, keyword, selectedSkills, selectedWorkType, selectedDuration]);

    if (!mounted) return null; // Avoid rendering flash before hydration

    return (
        <div className="min-h-screen flex flex-col bg-[#fcfcfc]">
            <Navbar />

            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-28 pb-20">
                {/* Header Section */}
                <div className="mb-10 lg:mb-12">
                    <h1 className="font-display text-3xl md:text-4xl lg:text-[42px] font-extrabold text-[#1a1a1a] tracking-tight mb-2">
                        Explore Internships
                    </h1>
                    <p className="text-slate-600 font-medium text-sm md:text-base">
                        Find and apply to the best opportunities
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

                    {/* Dark Sidebar Filters — pill on mobile, full sidebar on lg+ */}
                    <aside className="w-full lg:w-[280px] shrink-0">

                        {/* ── MOBILE PILL: always-visible search + expand toggle ── */}
                        <div className="lg:hidden bg-[#1a1a1a] rounded-full px-4 py-2.5 flex items-center gap-3 shadow-lg">
                            <svg className="text-slate-400 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="Search internships..."
                                className="flex-1 min-w-0 bg-transparent text-white placeholder-slate-500 text-sm outline-none"
                            />
                            <button
                                onClick={() => setFilterOpen(!filterOpen)}
                                className="shrink-0 flex items-center gap-1.5 bg-[#2a2a2a] rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-300 border border-white/10 hover:border-white/25 transition-colors"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lime-400">
                                    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                                    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                                    <line x1="1" y1="14" x2="7" y2="14" />
                                    <line x1="9" y1="8" x2="15" y2="8" />
                                    <line x1="17" y1="16" x2="23" y2="16" />
                                </svg>
                                Filters
                                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className={`transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`}>
                                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>

                        {/* ── MOBILE EXPANDED FILTER PANEL ── */}
                        {filterOpen && (
                            <div className="lg:hidden mt-3 bg-[#1a1a1a] rounded-[20px] p-6 shadow-xl animate-in slide-in-from-top-2 duration-200">
                                {/* Skills */}
                                <div className="mb-6">
                                    <h4 className="text-[12px] text-slate-400 font-medium mb-2.5 uppercase tracking-wider">Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {AVAILABLE_SKILLS.map(skill => (
                                            <button key={skill} onClick={() => toggleSkill(skill)}
                                                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${selectedSkills.includes(skill)
                                                        ? 'border-lime-400 text-lime-400'
                                                        : 'border-white/20 text-slate-300 hover:border-white/40'
                                                    }`}
                                            >{skill}</button>
                                        ))}
                                    </div>
                                </div>
                                {/* Work Type */}
                                <div className="mb-6">
                                    <h4 className="text-[12px] text-slate-400 font-medium mb-2.5 uppercase tracking-wider">Work Type</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {WORK_TYPES.map(type => (
                                            <button key={type} onClick={() => setSelectedWorkType(type === selectedWorkType ? '' : type)}
                                                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${selectedWorkType === type ? 'border-lime-400 text-lime-400' : 'border-white/20 text-slate-300 hover:border-white/40'
                                                    }`}
                                            >{type}</button>
                                        ))}
                                    </div>
                                </div>
                                {/* Duration */}
                                <div className="mb-4">
                                    <h4 className="text-[12px] text-slate-400 font-medium mb-2.5 uppercase tracking-wider">Duration</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {DURATIONS.map(dur => (
                                            <button key={dur} onClick={() => setSelectedDuration(dur === selectedDuration ? '' : dur)}
                                                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${selectedDuration === dur ? 'border-lime-400 text-lime-400' : 'border-white/20 text-slate-300 hover:border-white/40'
                                                    }`}
                                            >{dur}</button>
                                        ))}
                                    </div>
                                </div>
                                {/* Apply */}
                                <button onClick={() => setFilterOpen(false)} className="w-full bg-lime-400 text-black font-bold text-sm rounded-full py-2.5 mt-2 hover:bg-lime-300 transition-colors">
                                    Apply Filters
                                </button>
                            </div>
                        )}

                        {/* ── DESKTOP FULL SIDEBAR ── */}
                        <div className="hidden lg:block bg-[#1a1a1a] text-white rounded-[24px] p-7 md:p-8 h-fit shadow-xl">
                            <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-5">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lime-400">
                                    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                                    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                                    <line x1="1" y1="14" x2="7" y2="14" />
                                    <line x1="9" y1="8" x2="15" y2="8" />
                                    <line x1="17" y1="16" x2="23" y2="16" />
                                </svg>
                                <h3 className="font-semibold text-[17px] text-white tracking-wide">Filters</h3>
                            </div>

                            {/* Keyword */}
                            <div className="mb-8">
                                <h4 className="text-[13px] text-slate-300 font-medium mb-3">Keywords</h4>
                                <div className="relative">
                                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                                        placeholder="e.g. Frontend"
                                        className="w-full bg-[#2a2a2a] text-white placeholder-slate-500 rounded-full py-2.5 pl-9 pr-4 text-sm outline-none border border-transparent focus:border-lime-500/50 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Skills */}
                            <div className="mb-8">
                                <h4 className="text-[13px] text-slate-300 font-medium mb-3">Skills</h4>
                                <div className="flex flex-wrap gap-2.5">
                                    {AVAILABLE_SKILLS.map(skill => (
                                        <button key={skill} onClick={() => toggleSkill(skill)}
                                            className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${selectedSkills.includes(skill)
                                                    ? 'bg-transparent border-lime-400 text-lime-400'
                                                    : 'bg-transparent border-white/20 text-slate-300 hover:border-white/40'
                                                }`}
                                        >{skill}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Work Type */}
                            <div className="mb-8">
                                <h4 className="text-[13px] text-slate-300 font-medium mb-3">Work Type</h4>
                                <div className="flex flex-col gap-2.5">
                                    {WORK_TYPES.map(type => (
                                        <button key={type} onClick={() => setSelectedWorkType(type === selectedWorkType ? '' : type)}
                                            className={`text-left text-[13px] transition-colors ${selectedWorkType === type ? 'text-lime-400 font-semibold' : 'text-slate-400 hover:text-white'
                                                }`}
                                        >{type}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <h4 className="text-[13px] text-slate-300 font-medium mb-3">Duration</h4>
                                <div className="flex flex-col gap-2.5">
                                    {DURATIONS.map(dur => (
                                        <button key={dur} onClick={() => setSelectedDuration(dur === selectedDuration ? '' : dur)}
                                            className={`text-left text-[13px] transition-colors ${selectedDuration === dur ? 'text-lime-400 font-semibold' : 'text-slate-400 hover:text-white'
                                                }`}
                                        >{dur}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 w-full min-w-0">
                        {loading ? (
                            <SkeletonGrid count={9} gridClass="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
                        ) : filteredJobs.length > 0 ? (
                            <JobCardGrid jobs={filteredJobs} gridClass="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
                        ) : (
                            <div className="w-full flex flex-col items-center justify-center py-32 text-center rounded-[24px] border-2 border-dashed border-slate-200">
                                <span className="text-4xl mb-4">🔍</span>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">No internships found</h3>
                                <p className="text-slate-500 text-sm">Try tweaking your filters or search terms.</p>
                                <button
                                    onClick={() => {
                                        setKeyword('');
                                        setSelectedSkills([]);
                                        setSelectedWorkType('');
                                        setSelectedDuration('');
                                    }}
                                    className="mt-6 text-sm font-semibold text-lime-600 hover:text-lime-700 underline"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}
