'use client';

import { useMemo } from 'react';
import { FaGoogle } from 'react-icons/fa6';
import { signIn } from 'next-auth/react';
import { saveOAuthReferralCode, saveOAuthRole } from '@/lib/oauth';
import { ROUTES } from '@/constants';
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
  void onSuccess;
  void onRequiresEmail;
  void onRequiresVerification;

  const buttonClass = useMemo(
    () =>
      className ||
      'relative flex-1 min-h-[42px] rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50',
    [className],
  );

  const handleClick = async () => {
    onStart?.();
    try {
      saveOAuthRole(role);
      saveOAuthReferralCode(referralCode);
      await signIn('google', {
        callbackUrl: ROUTES.oauthGoogleBridge,
      });
    } catch (err) {
      onError('Login failed. Please try again.');
    } finally {
      onComplete?.();
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`${buttonClass} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      <div className="flex h-[38px] w-full items-center justify-center gap-2 text-sm font-semibold text-slate-700">
          <FaGoogle className="text-red-500 text-base" />
          <span>Google</span>
      </div>
    </button>
  );
}
