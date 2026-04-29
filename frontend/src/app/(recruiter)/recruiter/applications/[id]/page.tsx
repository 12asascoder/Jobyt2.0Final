'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import toast from 'react-hot-toast';
import { resolveAssetUrl } from '@/lib/assetUrl';

interface ApplicationDetail {
  id: string;
  applicant_id: string;
  job_id: string;
  resume_id?: string | null;
  resume_snapshot_url?: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  photo_url?: string | null;
  status: string;
  skills: string[];
  job_skills?: string[];
  education?: Array<{ institution?: string; degree?: string; year?: number; field?: string }>;
  job_title: string;
  job_location: string | null;
  created_at: string;
  skill_match?: number;
  responses?: Record<string, string>;
  resume_url?: string | null;
}

const getInitials = (name: string | null) => {
  if (!name) return 'C';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

const computeMatchScore = (candidateSkills: string[] = [], jobSkills: string[] = []) => {
  const normalize = (value: string) => value.trim().toLowerCase();
  const candidate = new Set(candidateSkills.map(normalize).filter(Boolean));
  const required = [...new Set(jobSkills.map(normalize).filter(Boolean))];

  if (required.length === 0) {
    return candidate.size > 0 ? 100 : 0;
  }

  let matched = 0;
  required.forEach((skill) => {
    if (candidate.has(skill)) matched += 1;
  });

  return Math.max(0, Math.min(100, Math.round((matched / required.length) * 100)));
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const res = await api.get<ApplicationDetail>(
          `/applications/recruiter/applicants/${applicationId}`
        );
        if (res.data) {
          setApplication(res.data);
        }
      } catch (err) {
        toast.error('Failed to load application details');
        router.push(ROUTES.recruiterApplications);
      } finally {
        setLoading(false);
      }
    };

    if (applicationId) {
      fetchApplication();
    }
  }, [applicationId, router]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await api.patch(`/applications/${applicationId}/status`, {
        status: 'in_review',
      });
      toast.success('Application moved to reviewed!');
      router.push(ROUTES.recruiterApplications);
    } catch (err) {
      toast.error('Failed to move application to reviewed');
    } finally {
      setAccepting(false);
    }
  };

  const [fetchingResume, setFetchingResume] = useState(false);

  const handleViewResume = async () => {
    setFetchingResume(true);
    try {
      const res = await api.get<{ url: string }>(`/applications/${applicationId}/resume-url`);
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        toast.error('Resume URL not found');
      }
    } catch (err) {
      toast.error('Failed to load secure resume URL');
    } finally {
      setFetchingResume(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center">
        <p className="text-slate-500">Application not found</p>
      </div>
    );
  }

  const skillMatch =
    typeof application.skill_match === 'number'
      ? application.skill_match
      : computeMatchScore(application.skills || [], application.job_skills || []);
  const hasResume = Boolean(
    application.resume_url ||
      application.resume_snapshot_url ||
      application.responses?.['resume_url'],
  );
  const jobQuestions = [
    { label: 'Do you have any previous experience? Elaborate.', response: application.responses?.['experience'] || '' },
    { label: 'What are some of the projects you have worked on?', response: application.responses?.['projects'] || '' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="max-w-6xl mx-auto pb-6 pt-6 px-4">
        <button
          onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 text-sm font-medium mb-4"
        >
          ← Back to Applications
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 rounded-xl m-4 space-y-6 pb-6" style={{ backgroundColor: '#ece9e2' }}>
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Candidate Info and Responses */}
          <div className="col-span-2 space-y-6">
            {/* Candidate Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start gap-4 mb-6">
                {application.photo_url ? (
                  <img
                    src={resolveAssetUrl(application.photo_url) || ''}
                    alt={application.name || 'Candidate'}
                    className="w-24 h-24 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                    {getInitials(application.name)}
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-black text-slate-900 mb-2">{application.name || 'Candidate'}</h1>
                  <p className="text-sm text-slate-600 mb-3">{application.education?.[0]?.institution}</p>
                  <p className="text-xs text-slate-500">Applied {new Date(application.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Personal Info */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-bold text-slate-900 mb-3">Personal Info</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 font-medium">Full Name</p>
                    <p className="text-slate-900">{application.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Email</p>
                    <p className="text-slate-900">{application.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Number</p>
                    <p className="text-slate-900">{application.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate's Response */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">Candidate's Response</h3>
              {jobQuestions.map((q, idx) => (
                <div key={idx}>
                  <p className="text-sm font-semibold text-slate-900 mb-2">{q.label}</p>
                  <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 min-h-[80px]">
                    {q.response || '(No response provided)'}
                  </div>
                </div>
              ))}
            </div>

            {/* Accept Button */}
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full px-4 py-3 bg-lime-300 text-black font-bold rounded-full hover:bg-lime-400 disabled:opacity-50 transition-colors"
            >
              {accepting ? 'Moving...' : 'Accept Application'}
            </button>
          </div>

          {/* Right: Skill Match and Resume */}
          <div className="col-span-1 space-y-6">
            {/* Candidate's Skill Match */}
            <div className="bg-black rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg mb-6 text-center">Candidate's Skill Match</h3>
              <div className="flex justify-center mb-6">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="#404040"
                      strokeWidth="8"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="#CDDC39"
                      strokeWidth="8"
                      strokeDasharray={`${(skillMatch / 100) * 339.3} 339.3`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-black text-lime-300">{skillMatch}%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matched Skills */}
              <div className="space-y-2">
                {application.skills && application.skills.length > 0 ? (
                  application.skills.map((skill, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-lime-300"></span>
                      <span>{skill}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">No skills listed</p>
                )}
              </div>
            </div>

            {/* View Resume */}
            <div className="bg-black rounded-2xl p-6 text-white text-center">
              <h3 className="font-bold text-lg mb-4">View Resume</h3>
              <button
                onClick={() => void handleViewResume()}
                disabled={!hasResume || fetchingResume}
                className="w-full px-4 py-2 bg-lime-300 text-black font-bold rounded-lg hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {fetchingResume ? 'Loading...' : 'View Attached Resume'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
