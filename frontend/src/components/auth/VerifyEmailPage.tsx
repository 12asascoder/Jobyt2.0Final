'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button, Card, CardBody, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/auth.store';
import { AuthUser } from '@/types';

type VerifyStatus = 'loading' | 'success' | 'error' | 'pending';

const routeByRole = (user: AuthUser) =>
  user.role === 'recruiter'
    ? ROUTES.recruiterDashboard
    : user.role === 'admin'
      ? ROUTES.adminDashboard
      : ROUTES.dashboard;

const getVerifyErrorMessage = (err: unknown): string => {
  if (!(err instanceof ApiError)) {
    return 'Verification failed. Please try again.';
  }

  if (err.code === 'TOKEN_EXPIRED') {
    return 'This verification link has expired. Please request a new one.';
  }
  if (err.code === 'TOKEN_ALREADY_USED') {
    return 'This verification link has already been used.';
  }
  if (err.code === 'INVALID_TOKEN') {
    return 'Invalid verification link. Please request a new one.';
  }
  if (err.code === 'RATE_LIMITED') {
    return 'Too many attempts. Please wait a minute and try again.';
  }

  return err.message || 'Verification failed. Please try again.';
};

const getResendMessage = (err: unknown): string => {
  if (!(err instanceof ApiError)) {
    return 'Failed to resend verification email. Please try again.';
  }

  if (err.code === 'RATE_LIMITED') {
    return 'Too many resend attempts. Please wait a minute and try again.';
  }
  if (err.code === 'EMAIL_REQUIRED') {
    return 'Please add your email first before requesting verification.';
  }

  return err.message || 'Failed to resend verification email. Please try again.';
};

export function VerifyEmailPage() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const token = useMemo(() => params.get('token'), [params]);
  const pending = useMemo(() => params.get('pending') === '1', [params]);

  const [status, setStatus] = useState<VerifyStatus>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (pending && !token) {
      setStatus('pending');
      setMessage('Check your inbox for the verification link, then continue.');
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    const verify = async () => {
      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage('Email verified successfully. Redirecting...');
      } catch (err) {
        setStatus('error');
        setMessage(getVerifyErrorMessage(err));
      }
    };

    void verify();
  }, [token, pending]);

  useEffect(() => {
    if (status !== 'success') return;

    const destination = user ? routeByRole(user) : ROUTES.dashboard;
    const timer = window.setTimeout(() => {
      router.replace(destination);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [status, user, router]);

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage('');

    try {
      const res = await api.post<{ message?: string }>('/auth/resend-verification', {});
      setResendMessage(res.data?.message || 'Verification email sent. Please check your inbox.');
    } catch (err) {
      setResendMessage(getResendMessage(err));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6 md:p-8">
      <Card className="w-full max-w-[420px] rounded-3xl p-0 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden my-auto">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-primary to-brand-coral" />
        <CardBody className="p-6 md:p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verify your email</h1>
          <p className="text-slate-500 mt-2 font-medium text-sm mb-6">Complete verification to continue to your dashboard.</p>

          {status === 'loading' && (
            <div className="py-3">
              <Spinner className="mx-auto mb-3" />
              <p className="text-sm text-slate-600 font-medium">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-3">
              <p className="text-sm text-slate-600 font-medium mb-4">{message}</p>
              <Button className="w-full" onClick={() => router.replace(user ? routeByRole(user) : ROUTES.dashboard)}>
                Continue to dashboard
              </Button>
            </div>
          )}

          {status === 'pending' && (
            <div className="py-3">
              <p className="text-sm text-slate-600 font-medium mb-4">{message}</p>
              {resendMessage && (
                <p className="mb-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 font-medium">
                  {resendMessage}
                </p>
              )}
              <div className="flex flex-col gap-3">
                <Button className="w-full" onClick={handleResend} isLoading={resendLoading}>
                  Resend verification email
                </Button>
                <Button className="w-full" variant="outline" onClick={() => router.replace(ROUTES.login)}>
                  Back to sign in
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-3">
              <p className="mb-4 rounded-xl bg-red-50/80 border border-red-100 p-3 text-sm text-red-600 font-medium">
                {message}
              </p>
              {resendMessage && (
                <p className="mb-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 font-medium">
                  {resendMessage}
                </p>
              )}
              <div className="flex flex-col gap-3">
                <Button className="w-full" onClick={handleResend} isLoading={resendLoading}>
                  Resend verification email
                </Button>
                <Button className="w-full" variant="outline" onClick={() => router.replace(ROUTES.login)}>
                  Back to sign in
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
