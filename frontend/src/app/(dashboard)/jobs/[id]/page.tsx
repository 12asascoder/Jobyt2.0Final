'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Job } from '@/types';
import { Button, Spinner } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ROUTES } from '@/constants';
import Link from 'next/link';
import {
  FaArrowLeft,
  FaMapPin,
  FaBriefcase,
  FaCalendar,
  FaIndianRupeeSign,
  FaBookmark,
  FaCheck
} from 'react-icons/fa6';

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return 'Competitive';
  const fmt = (v: number) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
    return `₹${v}`;
  };
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [creditError, setCreditError] = useState<{ required: number; available: number } | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Guard against undefined or empty ID
    if (!id || id === 'undefined') {
      setLoading(false);
      router.push(ROUTES.dashboard);
      return;
    }

    Promise.all([
      api.get<Job>(`/jobs/${id}`),
      api.get<{ hasApplied: boolean }>(`/applications/jobs/${id}/check`).catch(() => ({ data: { hasApplied: false } }))
    ])
      .then(([jobRes, checkRes]) => {
        setJob(jobRes.data);
        setHasApplied(checkRes.data.hasApplied);
      })
      .catch(() => router.push(ROUTES.dashboard))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await api.post<{ creditsRemaining?: number }>(`/applications/jobs/${params.id}`, { cover_letter: coverLetter });
      setHasApplied(true);
      setShowModal(false);
      setShowSuccessOverlay(true);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 402) {
        setCreditError({
          required: err.data?.requiredCredits || 1,
          available: err.data?.availableCredits || 0
        });
        setShowModal(false);
        setShowCreditsModal(true);
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Failed to apply');
      }
    } finally {
      setApplying(false);
    }
  };

  const handleSaveJob = async () => {
    try {
      if (isSaved) {
        await api.delete(`/users/me/saved-jobs/${job?.id}`);
        setIsSaved(false);
        toast.success('Job removed from saved');
      } else {
        await api.post(`/users/me/saved-jobs/${job?.id}`, {});
        setIsSaved(true);
        toast.success('Job saved successfully!');
      }
    } catch (err) {
      toast.error(isSaved ? 'Failed to remove from saved' : 'Failed to save job');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>;
  if (!job) return null;

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header with breadcrumb and back button */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FaArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href={ROUTES.jobs} className="hover:text-[#1a1a1a] transition-colors">Jobs</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{job.title}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-3xl p-8 text-white">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-4xl font-extrabold mb-3 leading-tight">{job.title}</h1>
                {job.company_name && (
                  <p className="text-xl text-gray-300 font-semibold">{job.company_name}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-200">
              {job.location && (
                <div className="flex items-center gap-2">
                  <FaMapPin className="w-4 h-4" />
                  <span>{job.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <FaBriefcase className="w-4 h-4" />
                <span className="capitalize">{job.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <FaCalendar className="w-4 h-4" />
                <span>Posted {formatDate(job.created_at)}</span>
              </div>
            </div>

            {job.is_boosted && (
              <div className="mt-4 inline-flex items-center gap-2 bg-lime-400/20 text-lime-300 px-4 py-2 rounded-xl text-sm font-semibold">
                ⚡ Actively Hiring
              </div>
            )}
          </div>

          {/* Salary Section */}
          {(job.salary_min || job.salary_max) && (
            <div className="bg-white border border-[#e8e4dc] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <FaIndianRupeeSign className="w-5 h-5 text-[#1a1a1a]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600">Expected Salary</h2>
              </div>
              <p className="text-3xl font-extrabold text-[#1a1a1a]">{formatSalary(job.salary_min, job.salary_max)}</p>
              <p className="text-xs text-gray-500 mt-2">/month</p>
            </div>
          )}

          {/* Job Description */}
          <div className="bg-white border border-[#e8e4dc] rounded-2xl p-8">
            <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-4">About the Role</h2>
            <div className="prose prose-sm max-w-none text-gray-700 leading-8 whitespace-pre-wrap">
              {job.description}
            </div>
          </div>

          {/* Required Skills */}
          {job.skills.length > 0 && (
            <div className="bg-white border border-[#e8e4dc] rounded-2xl p-8">
              <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-6">Required Skills</h2>
              <div className="flex flex-wrap gap-3">
                {job.skills.map((skill) => (
                  <div
                    key={skill}
                    className="bg-[#1a1a1a] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2d2d2d] transition-colors"
                  >
                    {skill}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setShowModal(true)}
                disabled={hasApplied}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-base transition-all duration-200 ${hasApplied
                    ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                    : 'bg-lime-400 text-[#1a1a1a] hover:bg-lime-500 hover:shadow-lg active:scale-95'
                  }`}
              >
                {hasApplied ? '✓ Already Applied' : 'Apply Now'}
              </button>

              <button
                onClick={handleSaveJob}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 ${isSaved
                    ? 'bg-[#1a1a1a] text-lime-400 border-2 border-lime-400'
                    : 'bg-white border-2 border-[#1a1a1a] text-[#1a1a1a] hover:bg-gray-50'
                  }`}
              >
                <FaBookmark className="w-4 h-4" />
                {isSaved ? 'Saved' : 'Save Job'}
              </button>
            </div>

            {/* Info Card */}
            <div className="bg-white border border-[#e8e4dc] rounded-2xl p-6 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Job Type</p>
                <p className="text-lg font-bold text-[#1a1a1a] capitalize">{job.type}</p>
              </div>

              {job.location && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Location</p>
                  <p className="text-lg font-bold text-[#1a1a1a]">{job.location}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Posted</p>
                <p className="text-lg font-bold text-[#1a1a1a]">{formatDate(job.created_at)}</p>
              </div>

              {job.views_count !== undefined && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Applied By</p>
                  <p className="text-lg font-bold text-[#1a1a1a]">{job.views_count}+ Applicants</p>
                </div>
              )}
            </div>

            {/* Credit Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-sm text-blue-900">
                <span className="font-bold">1 Credit</span> will be deducted when you apply
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Apply for this Position">
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-[#1a1a1a] mb-1">{job.title}</h3>
            <p className="text-sm text-gray-600">
              {job.company_name || 'Company'}
              {job.location ? ` • ${job.location}` : ''}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900">
              <span className="font-bold">⚡ Cost:</span> 1 Credit will be deducted from your balance
            </p>
            <p className="text-xs text-blue-800 mt-2">
              Please ensure your profile is complete before applying.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Cover Letter <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full px-4 py-3 border border-[#e8e4dc] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent resize-none"
              rows={5}
              placeholder="Tell the recruiter why you're a great fit for this role..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex-1 bg-lime-400 text-[#1a1a1a] font-bold py-3 px-4 rounded-xl hover:bg-lime-500 disabled:opacity-50 transition-all duration-200 active:scale-95"
            >
              {applying ? 'Applying...' : 'Confirm & Apply'}
            </button>
            <button
              onClick={() => setShowModal(false)}
              disabled={applying}
              className="flex-1 bg-gray-100 text-[#1a1a1a] font-bold py-3 px-4 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Credits Insufficient Modal */}
      <Modal isOpen={showCreditsModal} onClose={() => setShowCreditsModal(false)} title="">
        <div className="space-y-5 text-center py-6">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
            ⚠️
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[#1a1a1a] mb-2">Insufficient Credits</h3>
            <p className="text-gray-600">
              This application requires <span className="font-bold">{creditError?.required || 1} credit</span>, but you have <span className="font-bold">{creditError?.available || 0}</span> available.
            </p>
          </div>
          <div className="flex gap-3 pt-3">
            <button
              onClick={() => router.push(ROUTES.credits)}
              className="flex-1 bg-lime-400 text-[#1a1a1a] font-bold py-3 px-4 rounded-xl hover:bg-lime-500 transition-colors active:scale-95"
            >
              Buy Credits
            </button>
            <button
              onClick={() => setShowCreditsModal(false)}
              className="flex-1 bg-gray-100 text-[#1a1a1a] font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Success Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-lime-100 rounded-full flex items-center justify-center mx-auto">
              <FaCheck className="w-10 h-10 text-lime-600" />
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-2">
                Application Submitted! 🎉
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Your application for <span className="font-bold">{job.title}</span> at <span className="font-bold">{job.company_name}</span> has been sent. The recruiter will review and get back to you soon.
              </p>
            </div>

            <div className="bg-lime-50 border border-lime-200 rounded-xl p-4 text-sm text-left">
              <p className="text-gray-700">
                <span className="font-bold">Next Step:</span> Check your <Link href={ROUTES.applications} className="text-lime-600 font-bold hover:underline">Applications</Link> to track the status.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowSuccessOverlay(false);
                  router.push(ROUTES.applications);
                }}
                className="flex-1 bg-lime-400 text-[#1a1a1a] font-bold py-3 px-4 rounded-xl hover:bg-lime-500 transition-colors active:scale-95"
              >
                View Applications
              </button>
              <button
                onClick={() => setShowSuccessOverlay(false)}
                className="flex-1 bg-gray-100 text-[#1a1a1a] font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
