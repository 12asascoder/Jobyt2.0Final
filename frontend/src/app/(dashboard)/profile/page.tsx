'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { ApplicantProfile, RecruiterProfile } from '@/types';
import { Spinner, Avatar } from '@/components/ui';
import toast from 'react-hot-toast';
import { FaPenToSquare, FaCheck } from 'react-icons/fa6';

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

  useEffect(() => {
    api.get<{ profile: ProfileData; completeness: number; email: string }>('/users/me')
      .then((r) => {
        reset(r.data.profile || {});
        setCompleteness(r.data.completeness);
        if (r.data.profile) {
          const p = r.data.profile as ApplicantProfile & RecruiterProfile;
          setPhotoUrl(p.photo_url || p.logo_url || null);

          // Calculate missing fields for the checklist
          const missing = [];
          if (!p.photo_url && !p.logo_url) missing.push('Upload Your Photo');
          if (!p.name || !p.phone || !p.location) missing.push('Fill details');
          if (user?.role === 'applicant' && !p.resume_url) missing.push('Upload Your Resume');
          setMissingFields(missing);
        }
      })
      .finally(() => setLoading(false));
  }, [reset, user]);

  const onSubmit = async (data: ProfileData) => {
    try {
      await api.put('/users/me', data);
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
    form.append('photo', file);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('hp_access')}` },
        body: form,
      });
      const json = await res.json();
      setPhotoUrl(json.data.url);
      toast.success('Photo updated!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-6xl mx-auto pb-10 px-4 sm:px-6">
      <h1 className="text-3xl font-bold font-brand mb-6 text-gray-900 tracking-tight">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-brand">
        {/* Left Column: Beige Form Container */}
        <div className="lg:col-span-2 bg-[#F4F1E9] rounded-3xl p-6 sm:p-8 shadow-sm border border-[#e8e4db] relative">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8 pb-20">
            
            {/* Avatar Row */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white shadow-sm shrink-0">
                <Avatar src={photoUrl} name={user?.email} size="xl" className="w-full h-full object-cover" />
              </div>
              <div>
                <label className="cursor-pointer bg-black text-white px-4 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-800 transition-colors inline-block mb-1.5 sm:mb-2">
                  {uploading ? 'Uploading...' : 'Upload New Photo'}
                  <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handlePhotoUpload} />
                </label>
                <p className="text-[10px] sm:text-xs text-gray-500 max-w-[200px]">800 x 800 px JPG or PNG allowed</p>
              </div>
            </div>

            {/* Personal Info */}
            <div className={`bg-white rounded-2xl p-6 shadow-sm relative transition-all border ${editBasic ? 'border-lime-400' : 'border-transparent'}`}>
              <button 
                type="button" 
                onClick={() => setEditBasic(!editBasic)}
                className={`absolute top-6 right-6 transition-all ${editBasic ? 'text-lime-500 opacity-100' : 'text-gray-400 hover:text-lime-500 opacity-60 hover:opacity-100'}`}
              >
                <FaPenToSquare />
              </button>
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">Personal Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Full Name</label>
                  <input 
                    {...register('name')} 
                    disabled={!editBasic}
                    className="w-full bg-transparent border-b border-transparent focus:border-lime-400 disabled:border-transparent focus:outline-none text-gray-900 font-medium py-1 disabled:opacity-100" 
                    placeholder="Your Name" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Email</label>
                  <input disabled value={user?.email || ''} className="w-full bg-transparent text-gray-900 font-medium py-1 opacity-70" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Location</label>
                  <input 
                    {...register('location')} 
                    disabled={!editBasic}
                    className="w-full bg-transparent border-b border-transparent focus:border-lime-400 disabled:border-transparent focus:outline-none text-gray-900 font-medium py-1 disabled:opacity-100" 
                    placeholder="City, Country" 
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            {user?.role === 'applicant' && (
              <div className={`bg-white rounded-2xl p-6 shadow-sm relative transition-all border ${editBio ? 'border-lime-400' : 'border-transparent'}`}>
                <button 
                  type="button" 
                  onClick={() => setEditBio(!editBio)}
                  className={`absolute top-6 right-6 transition-all ${editBio ? 'text-lime-500 opacity-100' : 'text-gray-400 hover:text-lime-500 opacity-60 hover:opacity-100'}`}
                >
                  <FaPenToSquare />
                </button>
                <h3 className="font-semibold text-gray-900 mb-2 text-lg">Bio</h3>
                <textarea 
                  {...register('bio')} 
                  disabled={!editBio}
                  rows={3}
                  className="w-full bg-transparent border-b border-transparent focus:border-lime-400 disabled:border-transparent focus:outline-none text-gray-700 text-sm leading-relaxed resize-none mt-2 disabled:opacity-100"
                  placeholder="Tell us about yourself..."
                />
              </div>
            )}

            {/* Corporate Info for Recruiters */}
            {user?.role === 'recruiter' && (
              <div className={`bg-white rounded-2xl p-6 shadow-sm relative transition-all border ${editCompany ? 'border-lime-400' : 'border-transparent'}`}>
                <button 
                  type="button" 
                  onClick={() => setEditCompany(!editCompany)}
                  className={`absolute top-6 right-6 transition-all ${editCompany ? 'text-lime-500 opacity-100' : 'text-gray-400 hover:text-lime-500 opacity-60 hover:opacity-100'}`}
                >
                  <FaPenToSquare />
                </button>
                <h3 className="font-semibold text-gray-900 mb-4 text-lg">Company Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Company Name</label>
                    <input {...register('company_name')} disabled={!editCompany} className="w-full bg-transparent border-b border-transparent focus:border-lime-400 disabled:border-transparent focus:outline-none text-gray-900 font-medium py-1 disabled:opacity-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Industry</label>
                    <input {...register('industry')} disabled={!editCompany} className="w-full bg-transparent border-b border-transparent focus:border-lime-400 disabled:border-transparent focus:outline-none text-gray-900 font-medium py-1 disabled:opacity-100" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Description</label>
                    <textarea {...register('description')} disabled={!editCompany} rows={2} className="w-full bg-transparent border-b border-transparent focus:border-lime-400 disabled:border-transparent focus:outline-none text-gray-900 font-medium py-1 resize-none disabled:opacity-100" />
                  </div>
                </div>
              </div>
            )}

            {/* Links */}
            <div className={`bg-white rounded-2xl p-6 shadow-sm relative transition-all border ${editLinks ? 'border-lime-400' : 'border-transparent'}`}>
              <button 
                type="button" 
                onClick={() => setEditLinks(!editLinks)}
                className={`absolute top-6 right-6 transition-all ${editLinks ? 'text-lime-500 opacity-100' : 'text-gray-400 hover:text-lime-500 opacity-60 hover:opacity-100'}`}
              >
                <FaPenToSquare />
              </button>
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">Links</h3>
              
              <div className="space-y-5">
                {user?.role === 'applicant' ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Portfolio Link</label>
                      <input {...register('portfolio_url')} disabled={!editLinks} type="url" className="w-full bg-black text-lime-400 disabled:text-lime-400/70 rounded-lg px-4 py-3 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors" placeholder="https://" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">LinkedIn Link</label>
                      <input {...register('linkedin_url')} disabled={!editLinks} type="url" className="w-full bg-black text-lime-400 disabled:text-lime-400/70 rounded-lg px-4 py-3 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors" placeholder="https://linkedin.com/in/" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Website</label>
                    <input {...register('website')} disabled={!editLinks} type="url" className="w-full bg-black text-lime-400 disabled:text-lime-400/70 rounded-lg px-4 py-3 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors" placeholder="https://" />
                  </div>
                )}
              </div>
            </div>

            {/* Save Container at the bottom */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <button 
                type="submit" 
                disabled={isSubmitting || (!editBasic && !editBio && !editCompany && !editLinks)}
                className="bg-[#c3ff3d] text-black font-semibold text-sm px-10 py-3 rounded-full hover:bg-[#aee62d] transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed shadow-md"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Dark Sidebar Cards */}
        <div className="space-y-6">
          {/* Complete Profile Card */}
          <div className="bg-[#0b0b0b] rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-900">
            <h3 className="text-white font-semibold text-lg mb-8 text-center sm:text-left">Complete Your Profile</h3>
            
            {/* Donut Chart */}
            <div className="relative w-36 h-36 sm:w-40 sm:h-40 mx-auto flex justify-center items-center mb-10">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#333" strokeWidth="12" fill="none" />
                <circle cx="50" cy="50" r="40" stroke="#c3ff3d" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * completeness) / 100} className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute flex items-center justify-center flex-col">
                <span className="text-2xl sm:text-3xl font-bold text-white">{completeness}%</span>
              </div>
            </div>

            {/* Checklist */}
            <ul className="space-y-4 text-sm font-medium pl-2 sm:pl-4">
              <li className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-lime-400 shrink-0"></div>
                <span className="text-lime-400">Setup Account</span>
              </li>
              <li className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Upload Your Photo') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                <span className={missingFields.includes('Upload Your Photo') ? 'text-gray-400' : 'text-lime-400'}>Upload Your Photo</span>
              </li>
              <li className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Fill details') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                <span className={missingFields.includes('Fill details') ? 'text-gray-400' : 'text-lime-400'}>Fill details</span>
              </li>
              {user?.role === 'applicant' && (
                <li className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Upload Your Resume') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                  <span className={missingFields.includes('Upload Your Resume') ? 'text-gray-400' : 'text-lime-400'}>Upload Your Resume</span>
                </li>
              )}
            </ul>
          </div>

          {/* Upload Resume Card */}
          {user?.role === 'applicant' && (
            <div className="bg-[#0b0b0b] rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-900 text-center">
              <h3 className="text-white font-semibold text-lg mb-6">Upload Your Resume</h3>
              <div className="border border-dashed border-gray-700 rounded-xl p-4 mb-4 hover:border-gray-500 transition-colors cursor-pointer group bg-[#111]">
                <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Choose File</span>
              </div>
              <button type="button" className="w-full bg-[#c3ff3d] text-black font-semibold text-sm py-3.5 rounded-xl hover:bg-[#aee62d] transition-colors mt-2">
                Generate with Jobyt
              </button>
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
