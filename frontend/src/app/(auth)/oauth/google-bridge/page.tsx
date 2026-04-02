'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Spinner, Button } from '@/components/ui';
import { ROUTES } from '@/constants';
import { api } from '@/lib/api';
import {
  clearOAuthReferralCode,
  clearOAuthRole,
  getOAuthReferralCode,
  getOAuthRole,
  OAuthResponseData,
  parseOAuthResponse,
} from '@/lib/oauth';
import { useAuthStore } from '@/store/auth.store';

type SessionWithGoogleToken = {
  googleIdToken?: string;
};

export default function GoogleBridgePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      if (status !== 'authenticated') return;

      try {
        const googleIdToken = (session as SessionWithGoogleToken | null)?.googleIdToken;
        if (!googleIdToken) {
          throw new Error('Google login session is missing token. Please try again.');
        }

        const role = getOAuthRole();
        const referralCode = getOAuthReferralCode();

        const res = await api.post('/auth/google', {
          idToken: googleIdToken,
          ...(referralCode ? { referralCode } : {}),
          ...(role ? { role } : {}),
        });

        clearOAuthRole();
        clearOAuthReferralCode();

        const parsed = parseOAuthResponse(res.data as OAuthResponseData);
        if (!parsed.tokens || !parsed.user) {
          throw new Error('Login failed. Please try again.');
        }

        setSession(parsed.tokens.accessToken, parsed.tokens.refreshToken, parsed.user);
        await signOut({ redirect: false });

        if (parsed.requiresEmail || !parsed.user.email) {
          router.replace(ROUTES.addEmail);
          return;
        }

        if (parsed.requiresVerification) {
          router.replace(`${ROUTES.verifyEmail}?pending=1`);
          return;
        }

        const destination =
          parsed.user.role === 'recruiter'
            ? ROUTES.recruiterDashboard
            : parsed.user.role === 'admin'
              ? ROUTES.adminDashboard
              : ROUTES.dashboard;

        router.replace(destination);
      } catch (err) {
        clearOAuthRole();
        clearOAuthReferralCode();
        await signOut({ redirect: false });
        setError(err instanceof Error ? err.message : 'Google login failed. Please try again.');
      }
    };

    void run();
  }, [router, session, setSession, status]);

  if (status === 'loading' || (status === 'authenticated' && !error)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardBody className="p-8 text-center">
            <Spinner className="mx-auto mb-4" />
            <h2 className="mb-2 text-xl font-bold text-gray-900">Completing Google login</h2>
            <p className="text-sm text-gray-500">Finalizing secure sign in...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardBody className="p-8 text-center">
          <div className="mb-3 text-4xl">⚠️</div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Google login failed</h2>
          <p className="mb-6 text-sm text-gray-500">
            {error || 'Authentication session expired. Please try again.'}
          </p>
          <Button onClick={() => router.replace(ROUTES.login)} className="w-full">
            Back to Sign In
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
