'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { ApplicantProfile, RecruiterProfile } from '@/types';
import { Button, Input, Card, CardBody, CardHeader, Spinner, Avatar } from '@/components/ui';
import toast from 'react-hot-toast';

type ProfileData = Partial<ApplicantProfile & RecruiterProfile>;

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [completeness, setCompleteness] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ProfileData>();

  useEffect(() => {
    api.get<{ profile: ProfileData; completeness: number; email: string }>('/users/me')
      .then((r) => {
        reset(r.data.profile || {});
        setCompleteness(r.data.completeness);
        if (r.data.profile) {
          const p = r.data.profile as ApplicantProfile & RecruiterProfile;
          setPhotoUrl(p.photo_url || p.logo_url || null);
        }
      })
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: ProfileData) => {
    try {
      await api.put('/users/me', data);
      toast.success('Profile updated!');
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
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Completeness */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="mb-1 flex justify-between text-sm font-medium text-blue-700">
          <span>Profile completeness</span><span>{completeness}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-blue-200">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${completeness}%` }} />
        </div>
      </div>

      {/* Photo */}
      <Card>
        <CardHeader><p className="font-semibold">Photo / Logo</p></CardHeader>
        <CardBody className="flex items-center gap-4">
          <Avatar src={photoUrl} name={user?.email} size="xl" />
          <label className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
            {uploading ? 'Uploading…' : 'Change photo'}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
        </CardBody>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader><p className="font-semibold">Profile Details</p></CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Full Name" {...register('name')} />
            <Input label="Phone" type="tel" {...register('phone')} />
            {user?.role === 'applicant' && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Bio</label>
                  <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} {...register('bio')} />
                </div>
                <Input label="Portfolio URL" type="url" {...register('portfolio_url')} />
                <Input label="GitHub URL" type="url" {...register('github_url')} />
                <Input label="LinkedIn URL" type="url" {...register('linkedin_url')} />
              </>
            )}
            {user?.role === 'recruiter' && (
              <>
                <Input label="Company Name" {...register('company_name')} />
                <Input label="Industry" {...register('industry')} />
                <Input label="Company Size" {...register('company_size')} />
                <Input label="Website" type="url" {...register('website')} />
                <Input label="Location" {...register('location')} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Company Description</label>
                  <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} {...register('description')} />
                </div>
              </>
            )}
            <Button type="submit" isLoading={isSubmitting}>Save Changes</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
