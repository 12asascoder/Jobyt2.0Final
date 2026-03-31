'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import { API_BASE } from '@/constants';
import { Spinner } from '@/components/ui';
import { Notification as AppNotification } from '@/types';

interface RecruiterProfileForm {
  name: string;
  company_name: string;
  industry: string;
  company_size: string;
  location: string;
  website: string;
  description: string;
}

interface ProfilePayload {
  profile?: Partial<RecruiterProfileForm> & {
    logo_url?: string | null;
  };
  completeness?: number;
  email?: string | null;
}

const emptyForm: RecruiterProfileForm = {
  name: '',
  company_name: '',
  industry: '',
  company_size: '',
  location: '',
  website: '',
  description: '',
};

const toAbsoluteUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = API_BASE.replace(/\/api\/v1\/?$/, '');
  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
};

export default function RecruiterProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [email, setEmail] = useState<string>('');
  const [completeness, setCompleteness] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [form, setForm] = useState<RecruiterProfileForm>(emptyForm);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [res, notificationsRes] = await Promise.all([
          api.get<ProfilePayload>('/users/me'),
          api.getPaginated<AppNotification>('/notifications?page=1&limit=5'),
        ]);
        const payload = res.data ?? {};
        const profile = payload.profile ?? {};

        setEmail(payload.email ?? '');
        setCompleteness(payload.completeness ?? 0);
        setLogoUrl(toAbsoluteUrl(profile.logo_url));
        setForm({
          name: profile.name ?? '',
          company_name: profile.company_name ?? '',
          industry: profile.industry ?? '',
          company_size: profile.company_size ?? '',
          location: profile.location ?? '',
          website: profile.website ?? '',
          description: profile.description ?? '',
        });

        setNotifications(notificationsRes.data || []);
        setUnreadNotifications((notificationsRes as unknown as { unread?: number }).unread || 0);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
        setNotificationsLoading(false);
      }
    };

    setNotificationsLoading(true);
    void load();
  }, []);

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

  const profileInitials = useMemo(() => {
    const source = form.company_name || form.name || email || 'R';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }, [email, form.company_name, form.name]);

  const onChange = (key: keyof RecruiterProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await api.post<{ url: string }>('/users/me/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const nextUrl = toAbsoluteUrl(res.data?.url);
      setLogoUrl(nextUrl);
      toast.success('Logo updated');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        company_name: form.company_name.trim(),
        industry: form.industry.trim(),
        company_size: form.company_size.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
        ...(form.website.trim() ? { website: form.website.trim() } : {}),
      };

      const res = await api.put<ProfilePayload>('/users/me', payload);
      const next = res.data;
      if (next?.profile) {
        setForm((prev) => ({
          ...prev,
          name: next.profile?.name ?? prev.name,
          company_name: next.profile?.company_name ?? prev.company_name,
          industry: next.profile?.industry ?? prev.industry,
          company_size: next.profile?.company_size ?? prev.company_size,
          location: next.profile?.location ?? prev.location,
          website: next.profile?.website ?? prev.website,
          description: next.profile?.description ?? prev.description,
        }));
      }
      if (typeof next?.completeness === 'number') {
        setCompleteness(next.completeness);
      }
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
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
    <div className="mx-auto max-w-[1120px] pb-8">
      <h1 className="text-[44px] leading-[1.02] font-black tracking-tight text-slate-900 mb-5">Profile</h1>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <section className="rounded-2xl bg-[#ece9e2] border border-lime-300 p-5">
          <div className="rounded-2xl bg-white p-5 border border-black/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-200 border border-black/10 flex items-center justify-center text-xl font-bold text-slate-700">
                {logoUrl ? <img src={logoUrl} alt="Company logo" className="w-full h-full object-cover" /> : profileInitials}
              </div>
              <div>
                <label className="inline-flex items-center rounded-lg bg-black text-lime-300 px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-slate-900">
                  {uploadingLogo ? 'Uploading...' : 'Upload Company Logo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={handleLogoUpload}
                  />
                </label>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG or WEBP</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Your Name" value={form.name} onChange={(v) => onChange('name', v)} placeholder="Hiring manager name" />
              <Field label="Email" value={email} disabled onChange={() => undefined} placeholder="" />
              <Field label="Company Name" value={form.company_name} onChange={(v) => onChange('company_name', v)} placeholder="Acme Inc." />
              <Field label="Industry" value={form.industry} onChange={(v) => onChange('industry', v)} placeholder="Software" />
              <Field label="Company Size" value={form.company_size} onChange={(v) => onChange('company_size', v)} placeholder="11-50" />
              <Field label="Location" value={form.location} onChange={(v) => onChange('location', v)} placeholder="Bengaluru, India" />
              <div className="md:col-span-2">
                <Field label="Website" value={form.website} onChange={(v) => onChange('website', v)} placeholder="https://example.com" type="url" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Company Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => onChange('description', e.target.value)}
                  placeholder="Tell candidates about your company."
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-black text-lime-300 px-5 py-2.5 text-sm font-bold hover:bg-slate-900 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-5 h-fit">
          <div className="rounded-2xl bg-black text-white p-5">
            <h2 className="text-lg font-bold mb-3">Profile Completion</h2>
            <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-lime-400" style={{ width: `${Math.min(100, Math.max(0, completeness))}%` }} />
            </div>
            <p className="text-3xl font-black text-lime-300 mt-3">{completeness}%</p>
            <p className="text-xs text-white/70 mt-2">Completeness is calculated from your recruiter profile fields and logo.</p>
          </div>

          <div className="rounded-2xl bg-black text-white p-5 border border-gray-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">Notifications {unreadNotifications > 0 ? `(${unreadNotifications})` : ''}</h2>
              {unreadNotifications > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllNotificationsRead}
                  className="text-xs text-lime-300 hover:text-lime-200 font-semibold"
                >
                  Mark all read
                </button>
              )}
            </div>

            {notificationsLoading ? (
              <div className="py-4 flex justify-center"><Spinner size="sm" /></div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-white/70">No notifications yet.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => !item.read && handleMarkNotificationRead(item.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-colors ${item.read ? 'border-white/10 bg-white/5' : 'border-lime-400/30 bg-lime-400/10'}`}
                  >
                    <p className={`text-sm ${item.read ? 'text-white/90' : 'text-white font-semibold'}`}>{item.title}</p>
                    <p className="text-xs text-white/70 mt-1 line-clamp-2">{item.body}</p>
                    <p className="text-[11px] text-white/50 mt-2">{new Date(item.created_at).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
      />
    </div>
  );
}
