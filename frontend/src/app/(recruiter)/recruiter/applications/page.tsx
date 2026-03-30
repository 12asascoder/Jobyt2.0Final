'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ROUTES } from '@/constants';
import { Button, Spinner } from '@/components/ui';
import { FaMagnifyingGlass, FaEnvelope, FaPhone, FaGraduationCap } from 'react-icons/fa6';

type ApplicationStatus =
  | 'APPLIED'
  | 'SCREENING'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'HIRED'
  | 'REJECTED';

interface RecruiterApplicationRow {
  id: string;
  job_id: string;
  applicant_id: string;
  status: ApplicationStatus;
  created_at: string;
  name: string | null;
  photo_url?: string | null;
  skills?: string[];
  job_title?: string;
  job_location?: string | null;
}

type TabFilter = 'ALL' | 'PENDING' | 'REVIEWED' | 'INTERVIEW' | 'REJECTED';

const tabFilters: TabFilter[] = ['ALL', 'PENDING', 'REVIEWED', 'INTERVIEW', 'REJECTED'];

const normalizeToUiStatus = (status: ApplicationStatus): Exclude<TabFilter, 'ALL'> => {
  if (status === 'REJECTED') return 'REJECTED';
  if (status === 'INTERVIEW' || status === 'SELECTED' || status === 'HIRED') return 'INTERVIEW';
  if (status === 'SCREENING' || status === 'SHORTLISTED') return 'REVIEWED';
  return 'PENDING';
};

const statusPillClass: Record<Exclude<TabFilter, 'ALL'>, string> = {
  PENDING: 'bg-amber-100 text-amber-600',
  REVIEWED: 'bg-blue-100 text-blue-600',
  INTERVIEW: 'bg-lime-100 text-lime-700',
  REJECTED: 'bg-rose-100 text-rose-600',
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
    return `${mins} minutes ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours} hours ago`;
  }
  const days = Math.floor(diffMs / day);
  return `${days} days ago`;
};

export default function RecruiterApplicationsPage() {
  const [applications, setApplications] = useState<RecruiterApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      const res = await api.getPaginated<RecruiterApplicationRow>('/applications/recruiter/applicants?limit=100');
      setApplications(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((application) => {
      const uiStatus = normalizeToUiStatus(application.status);
      const matchesTab = activeTab === 'ALL' || uiStatus === activeTab;
      const matchesQuery =
        query.length === 0 ||
        (application.name || '').toLowerCase().includes(query) ||
        (application.job_title || '').toLowerCase().includes(query);
      return matchesTab && matchesQuery;
    });
  }, [applications, activeTab, search]);

  const updateStatus = async (applicationId: string, status: ApplicationStatus) => {
    try {
      setUpdatingId(applicationId);
      await api.patch(`/applications/${applicationId}/status`, { status });
      setApplications((prev) =>
        prev.map((application) =>
          application.id === applicationId ? { ...application, status } : application,
        ),
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-[1120px] mx-auto">
      <div className="mb-4">
        <h1 className="text-[44px] leading-[1.02] font-black tracking-tight text-slate-900">Applications</h1>
        <p className="mt-1 text-[30px] leading-tight text-slate-700">Review and manage candidate applications</p>
      </div>

      <section className="rounded-[18px] bg-[#ece9e2] border border-[#e3dfd7] p-4 h-[620px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#111827_transparent]">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="w-full xl:w-[280px] rounded-full bg-lime-300 px-4 py-2.5 flex items-center gap-2">
            <FaMagnifyingGlass className="text-slate-700 text-sm" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Position or Name"
              className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-700/70 outline-none"
            />
          </div>

          <div className="w-full xl:w-auto rounded-full bg-black p-1.5 flex items-center gap-1 overflow-x-auto">
            {tabFilters.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-lime-300 text-black'
                    : 'text-white/85 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 bg-white">
            No applications found.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((application) => {
              const uiStatus = normalizeToUiStatus(application.status);
              return (
                <article key={application.id} className="rounded-xl bg-white p-4 border border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {application.photo_url ? (
                        <img
                          src={application.photo_url}
                          alt={application.name || 'Candidate'}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-slate-700">
                            {(application.name || 'C')[0].toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[28px] leading-tight font-bold text-slate-900 truncate">{application.name || 'Candidate'}</p>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusPillClass[uiStatus]}`}>
                            {uiStatus}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-slate-700 mt-0.5">{application.job_title || 'Role not found'}</p>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-1 text-xs text-slate-500">
                          <p className="inline-flex items-center gap-1.5">
                            <FaEnvelope className="text-[11px]" />
                            {(application.name || 'candidate').replace(/\s+/g, '.').toLowerCase()}@email.com
                          </p>
                          <p className="inline-flex items-center gap-1.5">
                            <FaPhone className="text-[11px]" />
                            +91 9494613131
                          </p>
                          <p className="inline-flex items-center gap-1.5">
                            <FaGraduationCap className="text-[11px]" />
                            {application.job_location || 'Remote'}
                          </p>
                          <p>Applied {formatRelative(application.created_at)}</p>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {(application.skills || []).slice(0, 4).map((skill) => (
                            <span key={skill} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 shrink-0 w-[112px]">
                      <Link href={ROUTES.recruiterApplicationDetail(application.id, application.job_id)} className="w-full">
                        <Button size="sm" className="h-7 w-full px-3 text-[11px] bg-black text-white hover:bg-slate-800">View Details</Button>
                      </Link>
                      <Button
                        size="sm"
                        className="h-7 w-full px-3 text-[11px] bg-lime-300 text-black hover:bg-lime-400"
                        onClick={() => void updateStatus(application.id, 'INTERVIEW')}
                        disabled={updatingId === application.id}
                      >
                        Interview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-full px-3 text-[11px] justify-center"
                        onClick={() => void updateStatus(application.id, 'REJECTED')}
                        disabled={updatingId === application.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
