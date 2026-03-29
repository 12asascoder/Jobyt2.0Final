'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Button, Input, Card, CardBody } from '@/components/ui';
import { ROUTES, APP_NAME } from '@/constants';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <p className="text-center text-red-600">
        Invalid reset link. <Link href={ROUTES.forgotPassword} className="underline">Request a new one</Link>.
      </p>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900">Password reset!</h2>
        <p className="text-sm text-gray-500">You can now sign in with your new password.</p>
        <Button onClick={() => router.push(ROUTES.login)} className="w-full">Go to Sign In</Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Set new password</h1>
      <p className="mb-6 text-sm text-gray-500">Choose a strong password for your {APP_NAME} account.</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <Input
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <Button type="submit" isLoading={loading} className="w-full">Reset Password</Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardBody className="p-8">
          <Suspense fallback={<p className="text-center text-gray-500">Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </CardBody>
      </Card>
    </div>
  );
}
