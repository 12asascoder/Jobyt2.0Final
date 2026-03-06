'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardBody } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { ROUTES, APP_NAME } from '@/constants';
import { UserRole } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', role: 'applicant' as UserRole, referralCode: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await api.post('/auth/register', form);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardBody className="p-8 text-center">
            <div className="mb-4 text-5xl">📧</div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Check your email</h2>
            <p className="text-sm text-gray-500">
              We sent a verification link to <strong>{form.email}</strong>. Click the link to activate your account.
            </p>
            <button onClick={() => router.push(ROUTES.login)} className="mt-6 text-sm text-blue-600 hover:underline">
              Back to sign in
            </button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardBody className="p-8">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mb-6 text-sm text-gray-500">Join {APP_NAME} today. 150 free credits on sign-up!</p>

          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
            <Input label="Password" type="password" value={form.password} onChange={set('password')} hint="Minimum 8 characters" required />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">I am a…</label>
              <select
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.role}
                onChange={set('role')}
              >
                <option value="applicant">Job seeker</option>
                <option value="recruiter">Recruiter / Employer</option>
              </select>
            </div>

            <Input label="Referral Code (optional)" value={form.referralCode} onChange={set('referralCode')} placeholder="e.g. A3F9C2" />

            <Button type="submit" isLoading={isLoading} className="w-full">
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href={ROUTES.login} className="font-medium text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
