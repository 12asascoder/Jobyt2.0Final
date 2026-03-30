'use client';

import { useEffect, useMemo, useRef } from 'react';
import { FaGoogle } from 'react-icons/fa6';
import { api } from '@/lib/api';
import { OAuthResponseData, parseOAuthResponse, readPublicEnv } from '@/lib/oauth';
import { AuthTokens, AuthUser } from '@/types';

interface GoogleLoginButtonProps {
  referralCode?: string;
  disabled?: boolean;
  className?: string;
  onSuccess: (tokens: AuthTokens, user: AuthUser) => void;
  onRequiresEmail?: () => void;
  onRequiresVerification?: () => void;
  onError: (message: string) => void;
}

export function GoogleLoginButton({
  referralCode,
  disabled,
  className,
  onSuccess,
  onRequiresEmail,
  onRequiresVerification,
  onError,
}: GoogleLoginButtonProps) {
  const initialized = useRef(false);

  const clientId = readPublicEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID');

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
      'flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold shadow-sm text-sm disabled:opacity-60 disabled:cursor-not-allowed',
    [className],
  );

  const handleGoogleResponse = async (credential: string) => {
    try {
      const res = await api.post('/auth/google', {
        idToken: credential,
        ...(referralCode?.trim() ? { referralCode: referralCode.trim() } : {}),
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

  const handleClick = () => {
    if (!clientId) {
      onError('Google OAuth is not configured. Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }

    const googleApi = window.google?.accounts?.id;
    if (!googleApi) {
      onError('Google OAuth is not ready. Please try again.');
      return;
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

    googleApi.prompt();
  };

  return (
    <button type="button" disabled={disabled} className={buttonClass} onClick={handleClick}>
      <FaGoogle className="text-red-500 text-base" /> Google
    </button>
  );
}
