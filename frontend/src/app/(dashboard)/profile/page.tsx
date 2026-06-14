'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { ApplicantProfile, RecruiterProfile } from '@/types';
import { Spinner, Avatar } from '@/components/ui';
import toast from 'react-hot-toast';
import { FaPenToSquare, FaCheck } from 'react-icons/fa6';
import { ResumeUploadCard } from '@/components/profile/ResumeUploadCard';
import { ResumeListCard } from '@/components/profile/ResumeListCard';
import { NotificationPreferences } from '@/components/profile/NotificationPreferences';
import { resolveAssetUrl } from '@/lib/assetUrl';
type ProfileData = Partial<ApplicantProfile & RecruiterProfile>;

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [completeness, setCompleteness] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  
  // Edit States
  const [editBasic, setEditBasic] = useState(false);
  const [editBio, setEditBio] = useState(false);
  const [editCompany, setEditCompany] = useState(false);
  const [editLinks, setEditLinks] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ProfileData>();

  // Determine missing fields
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [resumeRefreshKey, setResumeRefreshKey] = useState(0);

  const loadProfile = useCallback(async () => {
    try {
      const r = await api.get<{ profile: ProfileData; completeness: number; email: string }>('/users/me');
      reset(r.data?.profile || {});
      setCompleteness(r.data?.completeness || 0);
      if (r.data?.profile) {
        const p = r.data.profile as ApplicantProfile & RecruiterProfile;
        setPhotoUrl(resolveAssetUrl(p.photo_url || p.logo_url || null));

        const missing: string[] = [];
        if (user?.role === 'recruiter') {
          if (!p.name) missing.push('Full Name');
          if (!r.data?.email) missing.push('Email');
          if (!p.companyName) missing.push('Company Name');
          if (!p.location) missing.push('Location');
          if (!p.logo_url) missing.push('Profile Picture');
        } else {
          if (!p.name) missing.push('Full Name');
          if (!r.data?.email) missing.push('Email');
          if (!p.phone) missing.push('Phone Number');
          if (!p.bio) missing.push('Bio');
          if (!p.portfolio_url) missing.push('Portfolio Link');
          if (!p.linkedin_url) missing.push('LinkedIn Link');
          if (!p.github_url) missing.push('GitHub Link');
          if (!p.photo_url) missing.push('Profile Picture');
        }
        setMissingFields(missing);
      } else if (user?.role === 'applicant') {
        setMissingFields([
          'Full Name',
          'Email',
          'Phone Number',
          'Bio',
          'Portfolio Link',
          'LinkedIn Link',
          'GitHub Link',
          'Profile Picture',
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [reset, user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const onSubmit = async (data: ProfileData) => {
    try {
      const toNullable = (value: unknown) => {
        if (typeof value !== 'string') return value ?? null;
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
      };

      // Client-side LinkedIn URL validation
      if (data.linkedin_url && typeof data.linkedin_url === 'string' && data.linkedin_url.trim()) {
        const linkedinVal = data.linkedin_url.trim().replace(/^https?:\/\//i, '').toLowerCase();
        if (!linkedinVal.startsWith('linkedin.com/') && !linkedinVal.startsWith('www.linkedin.com/')) {
          toast.error('LinkedIn URL must be from linkedin.com (e.g. https://linkedin.com/in/username)');
          return;
        }
      }

      const payload =
        user?.role === 'recruiter'
          ? {
              name: toNullable(data.name),
              location: toNullable(data.location),
              companyName: toNullable(data.companyName),
              industry: toNullable(data.industry),
              company_size: toNullable(data.company_size),
              description: toNullable(data.description),
              website: toNullable(data.website),
            }
          : {
              name: toNullable(data.name),
              phone: toNullable(data.phone),
              bio: toNullable(data.bio),
              portfolio_url: toNullable(data.portfolio_url),
              github_url: toNullable(data.github_url),
              linkedin_url: toNullable(data.linkedin_url),
            };

      await api.put('/users/me', payload);
      setEditBasic(false);
      setEditBio(false);
      setEditCompany(false);
      setEditLinks(false);
      setShowSaveModal(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const uploadRes = await api.post<{ url: string }>('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = uploadRes.data?.url;
      if (!uploadedUrl) {
        throw new Error('Photo upload succeeded but URL is missing.');
      }

      await api.put('/users/me', { photo_url: uploadedUrl });

      setPhotoUrl(resolveAssetUrl(uploadedUrl));
      toast.success('Photo updated!');
      await loadProfile();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-[1308px] ml-4 sm:ml-6 lg:ml-8 pr-4 pb-8 font-brand">
      <h1 className="text-[40px] leading-[54px] font-normal mb-3 text-black tracking-tight">My Profile</h1>

      <div className="grid grid-cols-1 xl:grid-cols-[800px_484px] gap-6 items-start">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Beige Form Container */}
          <div className="bg-[#F4F1EA] rounded-[20px] p-6 shadow-sm border border-[#e8e4db] relative">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-6">
            
            {/* Avatar Row */}
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-24 h-24 sm:w-[150px] sm:h-[150px] rounded-full overflow-hidden border-4 border-white shadow-sm shrink-0">
                <Avatar src={photoUrl} name={user?.email} size="xl" className="w-full h-full object-cover" />
              </div>
              <div className="text-center sm:text-left">
                <label className="cursor-pointer bg-black text-white px-5 py-2.5 rounded-[10px] text-sm font-normal hover:bg-gray-800 transition-colors inline-block mb-2">
                  {uploading ? 'Uploading...' : 'Upload New Photo'}
                  <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handlePhotoUpload} />
                </label>
                <p className="text-sm text-[#525252]">800 x 800 px JPG or PNG allowed</p>
              </div>
            </div>

            {/* Personal Info */}
            <div 
              onDoubleClick={() => setEditBasic(!editBasic)}
              title="Double-click to edit"
              className={`bg-white rounded-[10px] p-6 shadow-sm relative transition-all border ${editBasic ? 'border-lime-400' : 'border-[#c3ff3d]/60 cursor-pointer'}`}
            >
              <button 
                type="button" 
                onClick={() => setEditBasic(!editBasic)}
                className={`absolute top-6 right-6 transition-all ${editBasic ? 'text-lime-500 opacity-100' : 'text-gray-400 hover:text-lime-500 opacity-60 hover:opacity-100'}`}
              >
                <FaPenToSquare />
              </button>
              <h3 className="font-normal text-black mb-4 text-[18px] leading-6">Personal Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Full Name</label>
                  <input 
                    {...register('name')} 
                    readOnly={!editBasic}
                    className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 ${!editBasic ? 'cursor-pointer' : ''}`} 
                    placeholder="Your Name" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Email</label>
                  <input readOnly value={user?.email || ''} className="w-full bg-transparent text-gray-900 font-medium py-1 opacity-70 cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    {user?.role === 'recruiter' ? 'Location' : 'Phone Number'}
                  </label>
                  {user?.role === 'recruiter' ? (
                    <input
                      {...register('location')}
                      readOnly={!editBasic}
                      className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 ${!editBasic ? 'cursor-pointer' : ''}`}
                      placeholder="City, Country"
                    />
                  ) : (
                    <input
                      {...register('phone')}
                      readOnly={!editBasic}
                      className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 ${!editBasic ? 'cursor-pointer' : ''}`}
                      placeholder="+91 98XXXXXXXX"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {user?.role === 'applicant' && (
              <div 
                onDoubleClick={() => setEditBio(!editBio)}
                title="Double-click to edit"
                className={`bg-white rounded-[10px] p-6 shadow-sm relative transition-all border ${editBio ? 'border-lime-400' : 'border-[#c3ff3d]/60 cursor-pointer'}`}
              >
                <button 
                  type="button" 
                  onClick={() => setEditBio(!editBio)}
                  className={`absolute top-6 right-6 transition-all ${editBio ? 'text-lime-500 opacity-100' : 'text-gray-400 hover:text-lime-500 opacity-60 hover:opacity-100'}`}
                >
                  <FaPenToSquare />
                </button>
                <h3 className="font-normal text-black mb-2 text-[18px] leading-6">Bio</h3>
                <textarea 
                  {...register('bio')} 
                  readOnly={!editBio}
                  rows={3}
                  className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-700 text-sm leading-relaxed resize-none mt-2 ${!editBio ? 'cursor-pointer' : ''}`}
                  placeholder="Tell us about yourself..."
                />
              </div>
            )}

            {/* Corporate Info for Recruiters */}
            {user?.role === 'recruiter' && (
              <div 
                onDoubleClick={() => setEditCompany(!editCompany)}
                title="Double-click to edit"
                className={`bg-white rounded-[10px] p-6 shadow-sm relative transition-all border ${editCompany ? 'border-lime-400' : 'border-[#c3ff3d]/60 cursor-pointer'}`}
              >
                <button 
                  type="button" 
                  onClick={() => setEditCompany(!editCompany)}
                  className={`absolute top-6 right-6 transition-all ${editCompany ? 'text-lime-500 opacity-100' : 'text-gray-400 hover:text-lime-500 opacity-60 hover:opacity-100'}`}
                >
                  <FaPenToSquare />
                </button>
                <h3 className="font-normal text-black mb-4 text-[18px] leading-6">Company Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Company Name</label>
                    <input {...register('companyName')} readOnly={!editCompany} className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 ${!editCompany ? 'cursor-pointer' : ''}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Industry</label>
                    <input {...register('industry')} readOnly={!editCompany} className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 ${!editCompany ? 'cursor-pointer' : ''}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Company Size</label>
                    <input {...register('company_size')} readOnly={!editCompany} className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 ${!editCompany ? 'cursor-pointer' : ''}`} placeholder="e.g. 11-50" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Description</label>
                    <textarea {...register('description')} readOnly={!editCompany} rows={2} className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 resize-none ${!editCompany ? 'cursor-pointer' : ''}`} />
                  </div>
                </div>
              </div>
            )}

            {/* Links */}
            <div 
              onDoubleClick={() => setEditLinks(!editLinks)}
              title="Double-click to edit"
              className={`bg-white rounded-[10px] p-6 shadow-sm relative transition-all border ${editLinks ? 'border-lime-400' : 'border-[#c3ff3d]/60 cursor-pointer'}`}
            >
              <button 
                type="button" 
                onClick={() => setEditLinks(!editLinks)}
                className={`absolute top-6 right-6 transition-all ${editLinks ? 'text-lime-500 opacity-100' : 'text-gray-400 hover:text-lime-500 opacity-60 hover:opacity-100'}`}
              >
                <FaPenToSquare />
              </button>
              <h3 className="font-normal text-black mb-4 text-[18px] leading-6">Links</h3>
              
              <div className="space-y-5">
                {user?.role === 'applicant' ? (
                  <>
                    <div>
                      <label className="block text-base font-normal text-black mb-2">Portfolio Link</label>
                      <input {...register('portfolio_url')} readOnly={!editLinks} type="url" className="w-full bg-black text-lime-400 rounded-[10px] px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors cursor-pointer" placeholder="https://" />
                    </div>
                    <div>
                      <label className="block text-base font-normal text-black mb-2">LinkedIn Link</label>
                      <input
                        {...register('linkedin_url')}
                        readOnly={!editLinks}
                        type="url"
                        className="w-full bg-black text-lime-400 rounded-[10px] px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors cursor-pointer"
                        placeholder="https://linkedin.com/in/username"
                      />
                      {editLinks && (
                        <p className="text-xs text-gray-400 mt-1">Must be a valid linkedin.com profile URL</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-base font-normal text-black mb-2">GitHub Link</label>
                      <input {...register('github_url')} readOnly={!editLinks} type="url" className="w-full bg-black text-lime-400 rounded-[10px] px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors cursor-pointer" placeholder="https://github.com/username" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Website</label>
                    <input {...register('website')} readOnly={!editLinks} type="url" className="w-full bg-black text-lime-400 rounded-lg px-4 py-3 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors cursor-pointer" placeholder="https://" />
                  </div>
                )}
              </div>
            </div>

            {/* Save Container at the bottom */}
            <div className="flex justify-center pt-2">
              <button 
                type="submit" 
                disabled={isSubmitting || (!editBasic && !editBio && !editCompany && !editLinks)}
                className="bg-[#c3ff3d] text-black font-normal text-[18px] leading-6 px-5 py-[15px] rounded-[20px] hover:bg-[#aee62d] transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed shadow-md min-w-[158px] h-[54px]"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
        
        {/* Notification Preferences */}
        <NotificationPreferences />
      </div>

      {/* Right Column: Dark Sidebar Cards */}
        <div className="space-y-4">
          {/* Complete Profile Card */}
          <div className="bg-[#0b0b0b] rounded-[20px] p-6 shadow-xl border border-gray-900 min-h-[383px]">
            <h3 className="text-white font-normal text-[24px] leading-8 mb-6 text-center">Complete Your Profile</h3>
            
            {/* Donut Chart */}
            <div className="relative w-36 h-36 sm:w-[150px] sm:h-[150px] mx-auto flex justify-center items-center mb-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#333" strokeWidth="12" fill="none" />
                <circle cx="50" cy="50" r="40" stroke="#c3ff3d" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * completeness) / 100} className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute flex items-center justify-center flex-col">
                <span className="text-[27px] leading-9 font-normal text-white">{completeness}%</span>
              </div>
            </div>

            {/* Checklist Split into Columns */}
            <div className="flex flex-row justify-evenly gap-y-4 w-full text-sm font-normal">
              {/* Left Column: Basic Info */}
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-lime-400 shrink-0"></div>
                  <span className="text-lime-400 font-medium whitespace-nowrap">Setup Account</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Full Name') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                  <span className={missingFields.includes('Full Name') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Full Name</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Email') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                  <span className={missingFields.includes('Email') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Email</span>
                </li>
                {user?.role === 'recruiter' ? (
                  <>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Company Name') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('Company Name') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Company Name</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Location') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('Location') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Location</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Phone Number') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('Phone Number') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Phone Number</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Bio') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('Bio') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Bio</span>
                    </li>
                  </>
                )}
              </ul>

              {/* Right Column: Links & Media */}
              <ul className="space-y-3">
                {user?.role === 'applicant' ? (
                  <>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Portfolio Link') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('Portfolio Link') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Portfolio Link</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('LinkedIn Link') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('LinkedIn Link') ? 'text-gray-400' : 'text-lime-400 font-medium'}>LinkedIn Link</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('GitHub Link') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('GitHub Link') ? 'text-gray-400' : 'text-lime-400 font-medium'}>GitHub Link</span>
                    </li>
                  </>
                ) : null}
                <li className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Profile Picture') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                  <span className={missingFields.includes('Profile Picture') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Profile Picture</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Resume Upload + Parsing */}
          {user?.role === 'applicant' && (
            <div className="space-y-4">
              <ResumeUploadCard
                onSuccess={async () => {
                  toast.success('Resume uploaded successfully');
                  setLoading(true);
                  await loadProfile();
                  setResumeRefreshKey((prev) => prev + 1);
                }}
              />
              <ResumeListCard refreshKey={resumeRefreshKey} />
            </div>
          )}
        </div>
      </div>

      {/* Save Notification Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-brand">
          <div className="bg-[#0b0b0b] border border-gray-800 rounded-2xl w-full max-w-sm p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-lime-400/20 mx-auto flex items-center justify-center mb-5">
              <FaCheck className="text-3xl text-lime-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">Saved!</h3>
            <p className="text-white/60 text-sm mb-8 leading-relaxed">
              Your profile has been successfully updated and saved securely.
            </p>
            <button
              onClick={() => setShowSaveModal(false)}
              className="w-full px-6 py-3 rounded-lg bg-[#c3ff3d] text-black font-semibold hover:bg-[#aee62d] transition-colors text-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
