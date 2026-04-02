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
  onStart?: () => void;
  onComplete?: () => void;
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
  onStart,
  onComplete,
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
      'relative flex-1 min-h-[42px] rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50',
    [className],
  );

  const handleGoogleResponse = async (credential: string) => {
    onStart?.();
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
    } finally {
      onComplete?.();
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
                text?: string;
                shape: string;
                width?: number;
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
      googleApi.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: Math.max(160, Math.floor(containerRef.current.clientWidth)),
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
      <div className="relative overflow-hidden rounded-[10px] bg-white">
        <div
          ref={containerRef}
          className={`absolute inset-0 ${disabled ? 'pointer-events-none opacity-60' : 'pointer-events-auto opacity-0'}`}
        />
        <div className="flex h-[38px] w-full items-center justify-center gap-2 text-sm font-semibold text-slate-700 pointer-events-none">
          <FaGoogle className="text-red-500 text-base" />
          <span>Google</span>
        </div>
      </div>
    </div>
  );
}
