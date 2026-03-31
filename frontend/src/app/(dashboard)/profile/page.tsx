'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { ApplicantProfile, RecruiterProfile, Notification as AppNotification } from '@/types';
import { Spinner, Avatar } from '@/components/ui';
import toast from 'react-hot-toast';
import { FaPenToSquare, FaCheck } from 'react-icons/fa6';
import { ResumeUploadCard } from '@/components/profile/ResumeUploadCard';
import { ResumeListCard } from '@/components/profile/ResumeListCard';
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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const r = await api.get<{ profile: ProfileData; completeness: number; email: string }>('/users/me');
      reset(r.data?.profile || {});
      setCompleteness(r.data?.completeness || 0);
      if (r.data?.profile) {
        const p = r.data.profile as ApplicantProfile & RecruiterProfile;
        setPhotoUrl(resolveAssetUrl(p.photo_url || p.logo_url || null));

        const missing = [];
        if (!p.photo_url && !p.logo_url) missing.push('Upload Your Photo');
        if (user?.role === 'recruiter') {
          if (!p.name || !p.company_name || !p.location) missing.push('Fill details');
        } else {
          if (!p.name || !p.phone) missing.push('Fill details');
        }
        if (user?.role === 'applicant' && !p.resume_url) missing.push('Upload Your Resume');
        setMissingFields(missing);
      }
    } finally {
      setLoading(false);
    }
  }, [reset, user]);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const res = await api.getPaginated<AppNotification>('/notifications?page=1&limit=5');
      setNotifications(res.data || []);
      setUnreadNotifications((res as unknown as { unread?: number }).unread || 0);
    } catch {
      // Keep profile usable if notifications are temporarily unavailable.
      setNotifications([]);
      setUnreadNotifications(0);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
    void loadNotifications();
  }, [loadProfile, loadNotifications]);

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
      setUnreadNotifications((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadNotifications(0);
    } catch {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const onSubmit = async (data: ProfileData) => {
    try {
      const toNullable = (value: unknown) => {
        if (typeof value !== 'string') return value ?? null;
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
      };

      const payload =
        user?.role === 'recruiter'
          ? {
              name: toNullable(data.name),
              location: toNullable(data.location),
              company_name: toNullable(data.company_name),
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
    form.append('photo', file);
    try {
      const res = await api.post<{ url: string }>('/users/me/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = res.data?.url;
      if (!uploadedUrl) {
        throw new Error('Photo upload succeeded but URL is missing.');
      }

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
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    {user?.role === 'recruiter' ? 'Location' : 'Phone Number'}
                  </label>
                  {user?.role === 'recruiter' ? (
                    <input
                      {...register('location')}
                      disabled={!editBasic}
                      className="w-full bg-transparent border-b border-transparent focus:border-lime-400 disabled:border-transparent focus:outline-none text-gray-900 font-medium py-1 disabled:opacity-100"
                      placeholder="City, Country"
                    />
                  ) : (
                    <input
                      {...register('phone')}
                      disabled={!editBasic}
                      className="w-full bg-transparent border-b border-transparent focus:border-lime-400 disabled:border-transparent focus:outline-none text-gray-900 font-medium py-1 disabled:opacity-100"
                      placeholder="+91 98XXXXXXXX"
                    />
                  )}
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
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Company Size</label>
                    <input {...register('company_size')} disabled={!editCompany} className="w-full bg-transparent border-b border-transparent focus:border-lime-400 disabled:border-transparent focus:outline-none text-gray-900 font-medium py-1 disabled:opacity-100" placeholder="e.g. 11-50" />
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
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">GitHub Link</label>
                      <input {...register('github_url')} disabled={!editLinks} type="url" className="w-full bg-black text-lime-400 disabled:text-lime-400/70 rounded-lg px-4 py-3 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors" placeholder="https://github.com/username" />
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

          <div className="bg-[#0b0b0b] rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Notifications {unreadNotifications > 0 ? `(${unreadNotifications})` : ''}</h3>
              {unreadNotifications > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllNotificationsRead}
                  className="text-xs text-[#c3ff3d] hover:text-[#aee62d] font-semibold"
                >
                  Mark all read
                </button>
              )}
            </div>

            {notificationsLoading ? (
              <div className="py-6 flex justify-center"><Spinner size="sm" /></div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-400">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => !item.read && handleMarkNotificationRead(item.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-colors ${item.read ? 'border-gray-800 bg-black/30' : 'border-lime-400/30 bg-lime-400/10'}`}
                  >
                    <p className={`text-sm ${item.read ? 'text-gray-300' : 'text-white font-semibold'}`}>{item.title}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.body}</p>
                    <p className="text-[11px] text-gray-500 mt-2">{new Date(item.created_at).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Resume Upload + Parsing */}
          {user?.role === 'applicant' && (
            <div className="space-y-6">
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
