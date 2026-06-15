'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Spinner, Avatar } from '@/components/ui';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { FaGithub, FaLinkedin, FaGlobe, FaEnvelope, FaPhone, FaArrowLeft, FaFileArrowDown, FaStar } from 'react-icons/fa6';

interface PublicProfile {
  id: string;
  email: string;
  role: string;
  profile: {
    name: string | null;
    phone: string | null;
    photo_url: string | null;
    skills: string[];
    experience: any;
    education: any;
    portfolio_url: string | null;
    github_url: string | null;
    linkedin_url: string | null;
    bio: string | null;
    resume_url: string | null;
  } | null;
}

export default function PublicStudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicProfile | null>(null);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        const res = await api.get<PublicProfile>(`/users/public/${userId}`);
        setData(res.data || null);
      } catch (err) {
        console.error('Failed to load public profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchPublicProfile();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#121212] text-white">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-slate-400 font-medium animate-pulse">Loading public profile...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.profile || data.role !== 'applicant') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#121212] text-white p-6 text-center">
        <h2 className="text-2xl font-black text-rose-500 mb-2">Profile Not Found</h2>
        <p className="text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
          The public student profile you are looking for does not exist or may have been deleted.
        </p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white font-bold px-5 py-2.5 rounded-[12px] text-sm transition-all"
        >
          <FaArrowLeft />
          <span>Go Back</span>
        </button>
      </div>
    );
  }

  const { profile, email } = data;
  const avatarUrl = resolveAssetUrl(profile.photo_url);

  // Normalize URLs to ensure they open in new tabs correctly
  const formatUrl = (url: string | null) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  };

  return (
    <div className="min-h-screen bg-[#121212] text-slate-100 font-sans pb-16 relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#c3ff3d]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Container */}
      <div className="max-w-5xl mx-auto px-6 pt-12 relative z-10">
        
        {/* Back navigation */}
        <button
          onClick={() => router.back()}
          className="mb-8 flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] hover:bg-[#2e2e2e] text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-white/5"
        >
          <FaArrowLeft className="text-xs" />
          <span>Back</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-8 items-start">
          
          {/* Left Side: Avatar Card */}
          <div className="bg-[#1a1a1a]/90 backdrop-blur-md border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center shadow-xl">
            
            {/* Profile Avatar */}
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-lg mb-5 relative shrink-0">
              <Avatar src={avatarUrl} name={profile.name || email} size="xl" className="w-full h-full object-cover" />
            </div>

            {/* Name & Title */}
            <h1 className="text-2xl font-black tracking-tight text-white mb-2 leading-tight">
              {profile.name || 'Student Candidate'}
            </h1>
            <span className="px-3 py-1 rounded-full bg-lime-300/10 text-lime-300 text-[10px] font-black uppercase tracking-wider border border-lime-300/20 mb-6">
              Verified Candidate
            </span>

            {/* Biography */}
            {profile.bio && (
              <p className="text-xs text-slate-400 leading-relaxed font-medium mb-6 text-center border-t border-b border-white/5 py-4 w-full">
                {profile.bio}
              </p>
            )}

            {/* Resume Access link */}
            {profile.resume_url && (
              <a
                href={formatUrl(profile.resume_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#c3ff3d] hover:bg-[#aee62d] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 mb-6"
              >
                <FaFileArrowDown className="text-sm" />
                <span>View Public Resume</span>
              </a>
            )}

            {/* Contact details */}
            <div className="w-full space-y-3.5 text-left border-t border-white/5 pt-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Contact Details</span>
              
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <FaEnvelope className="text-slate-500 shrink-0 text-sm" />
                <span className="truncate">{email}</span>
              </div>
              
              {profile.phone && (
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <FaPhone className="text-slate-500 shrink-0 text-sm" />
                  <span>{profile.phone}</span>
                </div>
              )}

              {/* Social URLs */}
              {(profile.github_url || profile.linkedin_url || profile.portfolio_url) && (
                <div className="flex gap-3 pt-3 border-t border-white/5 justify-center w-full">
                  {profile.linkedin_url && (
                    <a
                      href={formatUrl(profile.linkedin_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-slate-300 hover:text-white rounded-xl transition-all text-sm border border-white/5"
                      title="LinkedIn"
                    >
                      <FaLinkedin />
                    </a>
                  )}
                  {profile.github_url && (
                    <a
                      href={formatUrl(profile.github_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-slate-300 hover:text-white rounded-xl transition-all text-sm border border-white/5"
                      title="GitHub"
                    >
                      <FaGithub />
                    </a>
                  )}
                  {profile.portfolio_url && (
                    <a
                      href={formatUrl(profile.portfolio_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-slate-300 hover:text-white rounded-xl transition-all text-sm border border-white/5"
                      title="Portfolio Website"
                    >
                      <FaGlobe />
                    </a>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Right Side: Professional Experience, Education, Skills */}
          <div className="space-y-8">
            
            {/* Skills Card */}
            <div className="bg-[#1a1a1a]/90 backdrop-blur-md border border-white/5 rounded-3xl p-8 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-lime-400 mb-5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-300"></span>
                <span>Technical Skills</span>
              </h3>
              {profile.skills && profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="bg-[#242424] hover:bg-[#2d2d2d] text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-white/5 transition-colors cursor-default"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No skills listed on this profile.</p>
              )}
            </div>

            {/* GitHub Projects Card */}
            <div className="bg-[#1a1a1a]/90 backdrop-blur-md border border-white/5 rounded-3xl p-8 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-lime-400 mb-5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-300"></span>
                <span>GitHub Projects</span>
              </h3>
              {githubRepos && githubRepos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {githubRepos.map((repo) => (
                    <a
                      key={repo.id}
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-[#2d2d2d] hover:bg-[#3d3d3d] text-slate-200 rounded-xl p-4 transition-colors border border-white/5"
                    >
                      <h4 className="font-bold text-white text-sm mb-1">{repo.name}</h4>
                      {repo.description && (
                        <p className="text-xs text-slate-400 mb-2 truncate">{repo.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        {repo.language && (
                          <span className="px-2 py-0.5 bg-[#242424] rounded">{repo.language}</span>
                        )}
                        <span className="flex items-center">
                          <FaStar className="mr-1" /> {repo.stargazers_count}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No public repositories available.</p>
              )}
            </div>
            {/* Experience Card */}
            <div className="bg-[#1a1a1a]/90 backdrop-blur-md border border-white/5 rounded-3xl p-8 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-lime-400 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-300"></span>
                <span>Work Experience</span>
              </h3>
              {profile.experience && profile.experience.length > 0 ? (
                <div className="space-y-6">
                  {profile.experience.map((exp: any, idx: number) => {
                    if (typeof exp === 'string') {
                      return (
                        <div key={idx} className="border-l-2 border-lime-300/40 pl-5 py-0.5">
                          <p className="text-xs text-slate-300 font-medium leading-relaxed">{exp}</p>
                        </div>
                      );
                    }
                    const role = exp.role || exp.title || '';
                    const company = exp.company || '';
                    const duration = exp.duration || exp.years || '';
                    const description = exp.description || '';
                    if (!role && !company) return null;
                    return (
                      <div key={idx} className="border-l-2 border-lime-300/40 pl-5 relative space-y-1">
                        <div className="absolute w-2 h-2 rounded-full bg-lime-300 -left-[5px] top-1.5 shadow-sm shadow-lime-900" />
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                          <h4 className="font-bold text-white text-sm">{role || 'Experience'}</h4>
                          {duration && (
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{duration}</span>
                          )}
                        </div>
                        {company && <p className="text-xs text-lime-300/70 font-semibold">{company}</p>}
                        {description && <p className="text-xs text-slate-400 leading-relaxed pt-1">{description}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No experience history documented.</p>
              )}
            </div>

            {/* Education Card */}
            <div className="bg-[#1a1a1a]/90 backdrop-blur-md border border-white/5 rounded-3xl p-8 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-lime-400 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-300"></span>
                <span>Education Background</span>
              </h3>
              {profile.education && profile.education.length > 0 ? (
                <div className="space-y-6">
                  {profile.education.map((edu: any, idx: number) => {
                    if (typeof edu === 'string') {
                      return (
                        <div key={idx} className="border-l-2 border-lime-300/40 pl-5 py-0.5">
                          <p className="text-xs text-slate-300 font-medium leading-relaxed">{edu}</p>
                        </div>
                      );
                    }
                    const degree = edu.degree || '';
                    const institution = edu.institution || edu.school || edu.university || '';
                    const year = edu.year || edu.duration || '';
                    if (!degree && !institution) return null;
                    return (
                      <div key={idx} className="border-l-2 border-lime-300/40 pl-5 relative space-y-1">
                        <div className="absolute w-2 h-2 rounded-full bg-lime-300 -left-[5px] top-1.5 shadow-sm shadow-lime-900" />
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                          <h4 className="font-bold text-white text-sm">{degree || 'Education Degree'}</h4>
                          {year && (
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{year}</span>
                          )}
                        </div>
                        {institution && <p className="text-xs text-lime-300/70 font-semibold">{institution}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No academic education background documented.</p>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
