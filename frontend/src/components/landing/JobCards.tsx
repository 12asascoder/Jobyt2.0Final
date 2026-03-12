'use client';

import { useEffect, useState } from 'react';
import {
    FaLocationDot,
    FaEarthAmericas,
    FaSackDollar,
    FaBriefcase,
    FaArrowRight,
} from 'react-icons/fa6';
import { FaRegClock } from 'react-icons/fa6';
import { API_BASE } from '@/constants';
import Link from 'next/link';

interface BackendJob {
    id: string;
    title: string;
    company_name?: string;
    location: string | null;
    type: 'full-time' | 'part-time' | 'contract' | 'remote' | 'internship';
    salary_min: number | null;
    salary_max: number | null;
    skills: string[];
    status: string;
    is_boosted: boolean;
    created_at: string;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
}

function formatSalary(min: number | null, max: number | null): string {
    if (!min && !max) return 'Competitive';
    const fmt = (v: number) => {
        if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
        if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
        return `₹${v}`;
    };
    if (min && max) return `${fmt(min)}-${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    return `Up to ${fmt(max!)}`;
}

function getTypeBadge(type: string): { text: string; color: string } | null {
    switch (type) {
        case 'internship':
            return { text: 'Internship', color: 'bg-purple-100/80 text-purple-700 border-purple-200' };
        case 'remote':
            return { text: 'Remote', color: 'bg-blue-100/80 text-brand-blue border-blue-200' };
        case 'contract':
            return { text: 'Contract', color: 'bg-orange-100/80 text-orange-700 border-orange-200' };
        default:
            return null;
    }
}

function getJobTypeLabel(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('-', '-');
}

function CompanyAvatar({ name }: { name: string }) {
    const initials = (name || '?')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const colors = [
        'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
        'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
    ];
    const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

    return (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm ${colors[colorIndex]}`}>
            {initials}
        </div>
    );
}

const HARDCODED_JOBS: BackendJob[] = [
    {
        id: 'hc-1',
        title: 'Software Development Engineer Intern',
        company_name: 'SpazorLabs',
        location: 'Remote',
        type: 'internship',
        salary_min: 15000,
        salary_max: 30000,
        skills: ['React', 'Next.js', 'TypeScript', 'Python'],
        status: 'open',
        is_boosted: true,
        created_at: new Date().toISOString(),
    },
    {
        id: 'hc-2',
        title: 'Frontend Engineer',
        company_name: 'TechCorp India',
        location: 'Bangalore, India',
        type: 'full-time',
        salary_min: 800000,
        salary_max: 1400000,
        skills: ['React', 'Tailwind CSS', 'Redux', 'JavaScript'],
        status: 'open',
        is_boosted: false,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
        id: 'hc-3',
        title: 'Backend Developer',
        company_name: 'InnovateX Solutions',
        location: 'Pune, India',
        type: 'full-time',
        salary_min: 1000000,
        salary_max: 1800000,
        skills: ['Node.js', 'Express', 'MongoDB', 'AWS'],
        status: 'open',
        is_boosted: true,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
        id: 'hc-4',
        title: 'Product Designer (UI/UX)',
        company_name: 'Designify Studios',
        location: 'Remote',
        type: 'contract',
        salary_min: 50000,
        salary_max: 90000,
        skills: ['Figma', 'UI/UX', 'Prototyping', 'Adobe XD'],
        status: 'open',
        is_boosted: false,
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
        id: 'hc-5',
        title: 'Data Scientist',
        company_name: 'Analytics Pro',
        location: 'Mumbai, India',
        type: 'full-time',
        salary_min: 1200000,
        salary_max: 2000000,
        skills: ['Python', 'Machine Learning', 'SQL', 'TensorFlow'],
        status: 'open',
        is_boosted: true,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
        id: 'hc-6',
        title: 'Marketing Manager',
        company_name: 'GrowthHackers',
        location: 'Remote',
        type: 'full-time',
        salary_min: 700000,
        salary_max: 1200000,
        skills: ['SEO', 'Content Strategy', 'Google Ads', 'Analytics'],
        status: 'open',
        is_boosted: false,
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
        id: 'hc-7',
        title: 'DevOps Engineer',
        company_name: 'CloudScale',
        location: 'Hyderabad, India',
        type: 'contract',
        salary_min: 1500000,
        salary_max: 2500000,
        skills: ['Kubernetes', 'Docker', 'AWS', 'CI/CD'],
        status: 'open',
        is_boosted: true,
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
        id: 'hc-8',
        title: 'HR Business Partner',
        company_name: 'PeopleFirst',
        location: 'Bangalore, India',
        type: 'full-time',
        salary_min: 600000,
        salary_max: 900000,
        skills: ['Recruitment', 'Employee Relations', 'HR Policies'],
        status: 'open',
        is_boosted: false,
        created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    },
    {
        id: 'hc-9',
        title: 'Mobile App Developer',
        company_name: 'AppWorks',
        location: 'Pune, India',
        type: 'full-time',
        salary_min: 900000,
        salary_max: 1500000,
        skills: ['Flutter', 'React Native', 'iOS', 'Android'],
        status: 'open',
        is_boosted: true,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
        id: 'hc-10',
        title: 'Cybersecurity Analyst',
        company_name: 'SecureNet',
        location: 'Delhi, India',
        type: 'full-time',
        salary_min: 1100000,
        salary_max: 1800000,
        skills: ['Network Security', 'Penetration Testing', 'SIEM'],
        status: 'open',
        is_boosted: false,
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
        id: 'hc-11',
        title: 'Technical Writer',
        company_name: 'DocuTech',
        location: 'Remote',
        type: 'part-time',
        salary_min: 400000,
        salary_max: 700000,
        skills: ['API Documentation', 'Markdown', 'Git'],
        status: 'open',
        is_boosted: false,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
        id: 'hc-12',
        title: 'Graphic Designer',
        company_name: 'CreativeMinds',
        location: 'Kolkata, India',
        type: 'internship',
        salary_min: 10000,
        salary_max: 20000,
        skills: ['Adobe Illustrator', 'Photoshop', 'Typography'],
        status: 'open',
        is_boosted: true,
        created_at: new Date().toISOString(),
    }
];

export function JobCards() {
    const [jobs, setJobs] = useState<BackendJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/jobs?limit=12&sort=date`)
            .then(async (res) => {
                if (!res.ok) throw new Error('API Error');
                return res.json();
            })
            .then((data) => {
                if (data.success && data.data && data.data.length > 0) {
                    setJobs(data.data);
                } else {
                    setJobs(HARDCODED_JOBS);
                }
            })
            .catch(() => {
                // API unreachable — use hardcoded state
                setJobs(HARDCODED_JOBS);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <section className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-20 bg-[#fcfcfc]">
                <div className="flex flex-col md:flex-row justify-between items-end mb-10">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                            Recommended opportunities
                        </h2>
                        <p className="text-slate-500 mt-2 text-base md:text-lg">
                            Curated internships and jobs based on current market trends
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className={`bg-white rounded-2xl p-5 md:p-6 border border-slate-100 animate-pulse h-[260px] ${i >= 4 ? 'hidden md:flex' : ''}`}>
                            <div className="flex gap-4 mb-5 mt-2">
                                <div className="w-12 h-12 rounded-xl bg-slate-200" />
                                <div className="flex-1">
                                    <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                                </div>
                            </div>
                            <div className="h-4 bg-slate-100 rounded w-2/3 mb-5" />
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="h-16 bg-slate-50 rounded-xl" />
                                <div className="h-16 bg-slate-50 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (jobs.length === 0) {
        return (
            <section className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-20 bg-[#fcfcfc]">
                <div className="flex flex-col md:flex-row justify-between items-end mb-10">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                            Recommended opportunities
                        </h2>
                        <p className="text-slate-500 mt-2 text-base md:text-lg">
                            Curated internships and jobs based on current market trends
                        </p>
                    </div>
                </div>
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                    <p className="text-2xl mb-2">🚀</p>
                    <p className="text-slate-500 font-medium text-lg">
                        New opportunities coming soon
                    </p>
                    <p className="text-slate-400 text-sm mt-1">
                        Check back later or sign up to get notified
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-20 bg-[#fcfcfc]">
            <div className="flex flex-col md:flex-row justify-between items-end mb-10">
                <div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Recommended opportunities
                    </h2>
                    <p className="text-slate-500 mt-2 text-base md:text-lg">
                        Curated internships and jobs based on current market trends
                    </p>
                </div>
                <Link
                    href="/login"
                    className="hidden md:flex text-slate-900 font-bold hover:text-brand-primary transition-colors items-center gap-2 group mt-4 md:mt-0 shadow-sm border border-slate-200 px-5 py-2.5 rounded-xl bg-white hover:border-brand-primary"
                >
                    View all{' '}
                    <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
                {jobs.map((job, i) => {
                    const badge = job.is_boosted
                        ? { text: 'Actively Hiring', color: 'bg-green-100/80 text-green-700 border-green-200' }
                        : getTypeBadge(job.type);
                    const isRemote = job.type === 'remote' || (job.location && job.location.toLowerCase().includes('remote'));

                    return (
                        <div
                            key={job.id}
                            className={`job-card bg-white rounded-2xl p-5 md:p-6 border border-slate-100 hover:border-brand-primary relative group cursor-pointer flex flex-col h-full ${i >= 4 ? 'hidden md:flex' : ''}`}
                            style={{
                                animation: `fadeInUp 0.6s ease-out ${(i % 4) * 0.1}s both`,
                            }}
                        >
                            {badge && (
                                <div
                                    className={`absolute top-5 right-5 text-[10px] font-bold px-2.5 py-1 rounded-full border tracking-wide uppercase ${badge.color}`}
                                >
                                    {badge.text}
                                </div>
                            )}

                            <div className="flex flex-col gap-4 mb-5 mt-2">
                                <CompanyAvatar name={job.company_name || job.title} />
                                <div>
                                    <h3 className="text-[17px] md:text-lg font-bold text-slate-900 leading-tight transition-colors line-clamp-2">
                                        {job.title}
                                    </h3>
                                    {job.company_name && (
                                        <p className="text-sm text-slate-500 font-medium mt-1">{job.company_name}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-5">
                                {isRemote ? (
                                    <FaEarthAmericas className="text-slate-400" />
                                ) : (
                                    <FaLocationDot className="text-slate-400" />
                                )}
                                <span className="truncate">{job.location || 'Remote'}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-slate-50 group-hover:bg-brand-primary/10 transition-colors p-3 rounded-xl border border-slate-100/60 h-[72px] flex flex-col justify-center">
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-extrabold tracking-wider mb-1">
                                        <FaSackDollar className="shrink-0" /> Salary
                                    </div>
                                    <div className="font-bold text-slate-800 text-sm truncate">
                                        {formatSalary(job.salary_min, job.salary_max)}
                                    </div>
                                </div>
                                <div className="bg-slate-50 group-hover:bg-brand-primary/10 transition-colors p-3 rounded-xl border border-slate-100/60 h-[72px] flex flex-col justify-center">
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-extrabold tracking-wider mb-1">
                                        <FaBriefcase className="shrink-0" /> Type
                                    </div>
                                    <div className="font-bold text-slate-800 text-sm capitalize truncate">
                                        {getJobTypeLabel(job.type)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                    <FaRegClock /> {timeAgo(job.created_at)}
                                </span>
                                <Link
                                    href="/login"
                                    className="text-slate-900 font-bold group-hover:text-white bg-slate-100 group-hover:bg-slate-900 px-4 py-2 rounded-lg transition-all duration-300 text-sm"
                                >
                                    Apply
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-10 text-center md:hidden">
                <Link
                    href="/login"
                    className="bg-white border-2 border-slate-200 text-slate-900 font-bold px-8 py-3 rounded-xl shadow-sm hover:border-brand-primary hover:text-brand-primary w-full transition-all text-sm inline-block"
                >
                    View all opportunities
                </Link>
            </div>
        </section>
    );
}
