'use client';

import { useEffect, useMemo, useRef } from 'react';
import { FaGoogle } from 'react-icons/fa6';
import { api } from '@/lib/api';
import { OAuthResponseData, parseOAuthResponse, readPublicEnv, saveOAuthRole } from '@/lib/oauth';
import { AuthTokens, AuthUser } from '@/types';

interface GoogleLoginButtonProps {
  referralCode?: string;
  role?: 'applicant' | 'recruiter';
  disabled?: boolean;
  className?: string;
  onSuccess: (tokens: AuthTokens, user: AuthUser) => void;
  onRequiresEmail?: () => void;
  onRequiresVerification?: () => void;
  onError: (message: string) => void;
}

export function GoogleLoginButton({
  referralCode,
  role,
  disabled,
  className,
  onSuccess,
  onRequiresEmail,
  onRequiresVerification,
  onError,
}: GoogleLoginButtonProps) {
  const initialized = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const roleRef = useRef<typeof role>(role);
  const referralCodeRef = useRef(referralCode);

  const clientId = readPublicEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID');

  useEffect(() => {
    roleRef.current = role;
    referralCodeRef.current = referralCode;
  }, [role, referralCode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const existing = document.querySelector('script[data-google-gsi="1"]');
    if (existing) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = '1';
    document.head.appendChild(script);
  }, []);

  const buttonClass = useMemo(
    () =>
      className ||
      'relative flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold shadow-sm text-sm disabled:opacity-60 disabled:cursor-not-allowed',
    [className],
  );

  const handleGoogleResponse = async (credential: string) => {
    try {
      const currentRole = roleRef.current;
      const currentReferralCode = referralCodeRef.current;

      console.log('[GoogleLoginButton] OAuth response received, role:', currentRole);
      saveOAuthRole(currentRole);
      console.log('[GoogleLoginButton] Role saved to localStorage');
      const res = await api.post('/auth/google', {
        idToken: credential,
        ...(currentReferralCode?.trim() ? { referralCode: currentReferralCode.trim() } : {}),
        ...(currentRole ? { role: currentRole } : {}),
      });

      const parsed = parseOAuthResponse(res.data as OAuthResponseData);

      if (parsed.requiresEmail) {
        onRequiresEmail?.();
        return;
      }

      if (parsed.requiresVerification) {
        onRequiresVerification?.();
        return;
      }

      if (!parsed.tokens || !parsed.user) {
        onError('Login failed. Please try again.');
        return;
      }

      onSuccess(parsed.tokens, parsed.user);
    } catch {
      onError('Login failed. Please try again.');
    }
  };

  useEffect(() => {
    if (disabled) return;

    if (!clientId) {
      onError('Google OAuth is not configured. Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }

    const renderGoogleButton = () => {
      const googleApi = window.google?.accounts?.id as
        | {
            initialize: (options: {
              client_id: string;
              callback: (response: { credential?: string }) => void;
            }) => void;
            renderButton: (
              parent: HTMLElement,
              options: {
                type: string;
                theme: string;
                size: string;
                text: string;
                shape: string;
                width: number;
              },
            ) => void;
          }
        | undefined;
      if (!googleApi || !containerRef.current) {
        return false;
      }

      if (!initialized.current) {
        googleApi.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response?.credential) {
              onError('Login failed. Please try again.');
              return;
            }
            void handleGoogleResponse(response.credential);
          },
        });
        initialized.current = true;
      }

      containerRef.current.innerHTML = '';
      const buttonWidth = Math.max(160, Math.floor(containerRef.current.clientWidth - 8));
      googleApi.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: buttonWidth,
      });

      return true;
    };

    if (renderGoogleButton()) return;

    const retry = window.setInterval(() => {
      if (renderGoogleButton()) {
        window.clearInterval(retry);
      }
    }, 200);

    const handleResize = () => {
      void renderGoogleButton();
    };
    window.addEventListener('resize', handleResize);

    const stopRetry = window.setTimeout(() => {
      window.clearInterval(retry);
      if (!initialized.current) {
        onError('Google OAuth is not ready. Please refresh and try again.');
      }
    }, 6000);

    return () => {
      window.clearInterval(retry);
      window.clearTimeout(stopRetry);
      window.removeEventListener('resize', handleResize);
    };
  }, [clientId, disabled, onError]);

  return (
    <div className={buttonClass} aria-disabled={disabled}>
      <FaGoogle className="text-red-500 text-base" /> Google
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div
          ref={containerRef}
          className={`h-full w-full ${disabled ? 'pointer-events-none' : 'pointer-events-auto'} opacity-0`}
        />
      </div>
    </div>
  );
}
