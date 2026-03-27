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
  FaCheck,
  FaRobot,
  FaRoute,
  FaFileLines
} from 'react-icons/fa6';
import { useAuthStore } from '@/store/auth.store';

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
  const { user } = useAuthStore();
  
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

  // AI Feature States
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [skillSuggestions, setSkillSuggestions] = useState<Record<string, string>>({});
  const [loadingInsights, setLoadingInsights] = useState(false);

  const [roadmap, setRoadmap] = useState<any>(null);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);

  const [atsScore, setAtsScore] = useState<any | null>(null);
  const [scoringAts, setScoringAts] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  useEffect(() => {
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

  // Fetch AI Insights once job is loaded
  useEffect(() => {
    if (!job || user?.role !== 'applicant') return;
    
    const fetchInsights = async () => {
      setLoadingInsights(true);
      try {
        const meRes = await api.get<any>('/users/me');
        const userSkills = meRes.data.profile?.skills || [];
        const bio = meRes.data.profile?.bio || '';
        
        setResumeText(`${bio}\\n\\nSkills: ${userSkills.join(', ')}`);

        if (job.skills.length > 0) {
          const matchRes = await api.post<any>('/jobs/match', { userSkills, jobSkills: job.skills });
          setMatchScore(matchRes.data.matchScore);
          setMatchedSkills(matchRes.data.matchedSkills);
          setMissingSkills(matchRes.data.missingSkills);

          const gapRes = await api.post<any>('/jobs/skill-gap', { userSkills, requiredSkills: job.skills });
          setSkillSuggestions(gapRes.data.suggestions);
        }
      } catch (err) {
        console.error('Failed to fetch AI insights:', err);
      } finally {
        setLoadingInsights(false);
      }
    };

    fetchInsights();
  }, [job, user?.role]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await api.post<{ creditsRemaining?: number }>(`/applications/jobs/${id}`, { cover_letter: coverLetter });
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

  const handleGenerateRoadmap = async () => {
    try {
      setGeneratingRoadmap(true);
      setShowRoadmapModal(true);
      const res = await api.post<any>('/roadmaps/generate', { missingSkills });
      setRoadmap(res.data.roadmap);
    } catch (err) {
      toast.error('Failed to generate roadmap');
      setShowRoadmapModal(false);
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  const handleScoreAts = async () => {
    try {
      setScoringAts(true);
      const token = localStorage.getItem('hp_access');
      let data;

      if (resumeFile) {
        const formData = new FormData();
        formData.append('file', resumeFile);
        formData.append('jobDescription', job?.description || '');
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/users/me/resume-score`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        
        if (!res.ok) throw new Error('ATS scoring failed');
        const json = await res.json();
        data = json.data;
      } else {
        const res = await api.post<any>('/users/me/resume-score', { 
          resumeText, 
          jobDescription: job?.description 
        });
        data = res.data;
      }
      setAtsScore(data);
    } catch (err) {
      toast.error('ATS scoring failed');
      console.error(err);
    } finally {
      setScoringAts(false);
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

            {/* AI Match Insights */}
            {user?.role === 'applicant' && job.skills.length > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaRobot className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-extrabold text-indigo-900">AI Match Insights</h2>
                </div>

                {loadingInsights ? (
                  <div className="flex justify-center py-6"><Spinner size="sm" /></div>
                ) : matchScore !== null ? (
                  <div className="space-y-5">
                    {/* Circular Score */}
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path className="text-indigo-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                          <path className={`${matchScore >= 80 ? 'text-green-500' : matchScore >= 50 ? 'text-yellow-500' : 'text-orange-500'}`} strokeDasharray={`${matchScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        </svg>
                        <span className="absolute text-sm font-bold text-indigo-900">{matchScore}%</span>
                      </div>
                      <div>
                        <p className="font-bold text-indigo-950">Match Score</p>
                        <p className="text-xs text-indigo-700 leading-relaxed">Based on your profile skills vs job requirements.</p>
                      </div>
                    </div>

                    {/* Missing Skills */}
                    {missingSkills.length > 0 ? (
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-indigo-900">Skill Gaps Detected:</h3>
                        <div className="space-y-2">
                          {missingSkills.map(skill => (
                            <div key={skill} className="bg-white rounded-xl p-3 shadow-sm border border-indigo-50">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                <span className="text-sm font-bold text-gray-800">{skill}</span>
                              </div>
                              {skillSuggestions[skill] && (
                                <p className="text-xs text-gray-600 pl-4">{skillSuggestions[skill]}</p>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <button
                          onClick={handleGenerateRoadmap}
                          className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md"
                        >
                          <FaRoute /> Generate Learning Roadmap
                        </button>
                      </div>
                    ) : (
                      <div className="bg-green-100 text-green-800 p-3 rounded-xl text-sm font-bold text-center border border-green-200">
                        🌟 You have 100% of the required skills!
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-indigo-500 text-center py-2">Could not load insights.</p>
                )}
              </div>
            )}

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

      {/* Roadmap Modal */}
      <Modal isOpen={showRoadmapModal} onClose={() => setShowRoadmapModal(false)} title="Your Custom Learning Roadmap">
        <div className="space-y-6">
          <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-900 border border-indigo-100">
            <p className="font-bold mb-1 flex items-center gap-2"><FaRobot className="text-indigo-600"/> AI-Generated Path</p>
            <p>This roadmap is specifically tailored to bridge your skill gap for this role.</p>
          </div>
          
          {generatingRoadmap ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <Spinner size="lg" />
              <p className="text-gray-500 font-medium">Generating your personalized roadmap...</p>
            </div>
          ) : roadmap ? (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {roadmap.map((week: any, idx: number) => (
                <div key={idx} className="relative pl-6 pb-4 border-l-2 border-indigo-200 last:border-0 last:pb-0">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white"></div>
                  <h3 className="font-bold text-gray-900 mb-1">Week {week.week}: {week.topic}</h3>
                  <ul className="space-y-2 mt-2">
                    {week.tasks.map((task: string, i: number) => (
                      <li key={i} className="text-sm text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-red-500">Failed to generate roadmap.</p>
          )}
          
          <div className="pt-2">
            <button onClick={() => setShowRoadmapModal(false)} className="w-full py-3 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition-colors">
              Close
            </button>
          </div>
        </div>
      </Modal>

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
          </div>

          {/* ATS Analyzer */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <FaFileLines className="text-blue-600"/> Resume ATS Analyzer
              </h4>
              <button 
                onClick={handleScoreAts}
                disabled={scoringAts || !resumeText.trim()}
                className="px-3 py-1.5 bg-white border border-gray-300 shadow-sm rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {scoringAts ? 'Analyzing...' : 'Analyze Fit'}
              </button>
            </div>
            
            {!atsScore && (
              <div className="space-y-4">
                <div className="border border-dashed border-gray-400 rounded-xl p-4 text-center hover:bg-gray-100 transition-colors">
                  <label className="cursor-pointer block">
                    <span className="text-sm font-bold text-blue-600 block mb-1">
                      {resumeFile ? '📄 ' + resumeFile.name : 'Click to Upload PDF Resume'}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">For maximum accuracy in ATS scoring</span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
                      setResumeFile(e.target.files?.[0] || null);
                      setResumeText(''); // clear text fallback
                    }} />
                  </label>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gray-50 px-2 text-gray-400 font-bold">OR PASTE TEXT</span>
                  </div>
                </div>

                <div>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-blue-500 resize-none bg-white opacity-80"
                    rows={3}
                    placeholder="Paste resume text or leave blank to use your profile string..."
                    value={resumeText}
                    onChange={(e) => {
                      setResumeText(e.target.value);
                      setResumeFile(null); // clear file
                    }}
                  />
                </div>
              </div>
            )}

            {atsScore && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Master Match Row */}
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -z-10 translate-x-10 -translate-y-10"></div>
                  <div className="flex items-center gap-4">
                    <div className={`text-4xl font-black ${atsScore.score >= 80 ? 'text-green-600' : atsScore.score >= 50 ? 'text-yellow-600' : 'text-orange-600'}`}>
                      {atsScore.score}%
                    </div>
                    <div>
                      <div className="font-extrabold text-gray-900 leading-tight">Overall Match</div>
                      <div className="text-[10px] text-gray-500 font-bold tracking-wider uppercase">NLP + LLM AI</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-200">
                      {atsScore.rolePrediction}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-gray-500 mt-1">
                      {atsScore.experience} • Q-Score: {atsScore.qualityScore}/100
                    </div>
                  </div>
                </div>

                {/* Section Scores Grid */}
                {atsScore.sectionScores && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Skills', val: atsScore.sectionScores.skillsScore || 0 },
                      { label: 'Experience', val: atsScore.sectionScores.experienceScore || 0 },
                      { label: 'Education', val: atsScore.sectionScores.educationScore || 0 }
                    ].map((s) => (
                      <div key={s.label} className="bg-white border border-gray-100 rounded-lg p-2 text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.02)]">
                        <div className={`text-lg font-black ${s.val >= 80 ? 'text-green-500' : s.val >= 50 ? 'text-yellow-500' : 'text-red-400'}`}>
                          {s.val}%
                        </div>
                        <div className="text-[10px] uppercase font-bold text-gray-400">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Explanation Explanation */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-900 leading-relaxed indent-2 italic font-medium">
                  "{atsScore.explanation}"
                </div>

                {/* Feedback Areas */}
                {atsScore.feedback && (
                  <div className="space-y-3">
                    {atsScore.missingKeywords?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          <span className="text-xs font-bold text-red-900">Missing Keywords (TF-IDF Priority)</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-3.5">
                          {atsScore.missingKeywords.map((kw: string) => (
                            <span key={kw} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold border border-red-200">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {atsScore.feedback.weakAreas?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                          <span className="text-xs font-bold text-orange-900">Weak Content Areas</span>
                        </div>
                        <ul className="list-disc pl-7 text-[10px] font-semibold text-orange-800 space-y-0.5">
                          {atsScore.feedback.weakAreas.map((w: string, i: number) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}

                    {atsScore.feedback.improvements?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          <span className="text-xs font-bold text-green-900">Suggested Improvements</span>
                        </div>
                        <ul className="list-disc pl-7 text-[10px] font-semibold text-green-800 space-y-0.5">
                          {atsScore.feedback.improvements.map((imp: string, i: number) => <li key={i}>{imp}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Download Button */}
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(atsScore, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `resume_analysis_${job.title.replace(/\\s+/g, '_')}.json`;
                    a.click();
                  }}
                  className="w-full py-2 bg-[#1a1a1a] text-white font-bold tracking-wide rounded-lg text-xs mt-2 hover:bg-gray-800 transition-colors shadow-lg"
                >
                  ↓ Download Full JSON Report
                </button>
              </div>
            )}
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
