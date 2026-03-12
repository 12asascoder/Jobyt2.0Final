'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Spinner, Card, CardBody, Button } from '@/components/ui';
import { ROUTES } from '@/constants';

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('Invalid link.'); return; }

    api.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof ApiError ? err.message : 'Verification failed');
      });
  }, [params]);

  return (
    <>
      {status === 'loading' && <><Spinner className="mx-auto mb-4" /><p>Verifying your email…</p></>}
      {status === 'success' && (
        <>
          <div className="mb-4 text-5xl">✅</div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Email verified!</h2>
          <p className="mb-6 text-sm text-gray-500">150 credits have been added to your account.</p>
          <Button onClick={() => router.push(ROUTES.login)} className="w-full">Sign in now</Button>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="mb-4 text-5xl">❌</div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Verification failed</h2>
          <p className="mb-6 text-sm text-gray-500">{message}</p>
          <Button variant="outline" onClick={() => router.push(ROUTES.login)} className="w-full">Back to sign in</Button>
        </>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardBody className="p-8 text-center">
          <Suspense fallback={<><Spinner className="mx-auto mb-4" /><p>Loading…</p></>}>
            <VerifyEmailContent />
          </Suspense>
        </CardBody>
      </Card>
    </div>
  );
}
