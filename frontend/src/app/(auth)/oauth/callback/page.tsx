'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ROUTES } from '@/constants';
import { Card, CardBody, Spinner, Button } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import {
  clearOAuthReferralCode,
  clearOAuthState,
  clearOAuthRole,
  getOAuthReferralCode,
  getOAuthRole,
  OAuthResponseData,
  parseOAuthResponse,
  readOAuthState,
} from '@/lib/oauth';

const isProvider = (value: string | null): value is 'github' | 'linkedin' =>
  value === 'github' || value === 'linkedin';

export default function OAuthCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('Finalizing secure login...');

  const provider = useMemo(() => params.get('provider'), [params]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!isProvider(provider)) {
          throw new Error('Invalid OAuth provider. Please start login again.');
        }

        const oauthError = params.get('error');
        if (oauthError) {
          throw new Error('Login failed. Please try again.');
        }

        const code = params.get('code');
        const state = params.get('state');
        if (!code || !state) {
          throw new Error('Login failed. Please try again.');
        }

        const savedState = readOAuthState(provider);
        if (!savedState || savedState !== state) {
          throw new Error('Login failed. Please try again.');
        }

        clearOAuthState(provider);

        const referralCode = getOAuthReferralCode();
        const role = getOAuthRole();

        console.log('[OAuthCallbackPage] Retrieved from localStorage:', { role, referralCode });

        const res = await api.post(`/auth/${provider}`, {
          code,
          state,
          ...(referralCode ? { referralCode } : {}),
          ...(role ? { role } : {}),
        });

        console.log('[OAuthCallbackPage] POST payload sent:', { provider, code, state, referralCode, role });

        clearOAuthReferralCode();
        clearOAuthRole();

        const parsed = parseOAuthResponse(res.data as OAuthResponseData);

        if (!parsed.tokens || !parsed.user) {
          throw new Error('Login failed. Please try again.');
        }

        setSession(parsed.tokens.accessToken, parsed.tokens.refreshToken, parsed.user);

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
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Login failed. Please try again.');
      }
    };

    void run();
  }, [params, provider, router, setSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardBody className="p-8 text-center">
          {status === 'loading' ? (
            <>
              <Spinner className="mx-auto mb-4" />
              <h2 className="mb-2 text-xl font-bold text-gray-900">Completing login</h2>
              <p className="text-sm text-gray-500">{message}</p>
            </>
          ) : (
            <>
              <div className="mb-3 text-4xl">⚠️</div>
              <h2 className="mb-2 text-xl font-bold text-gray-900">OAuth login failed</h2>
              <p className="mb-6 text-sm text-gray-500">{message}</p>
              <Button onClick={() => router.replace(ROUTES.login)} className="w-full">
                Back to Sign In
              </Button>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
