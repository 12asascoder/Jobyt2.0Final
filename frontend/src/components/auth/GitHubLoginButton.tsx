'use client';

import { useEffect, useRef } from 'react';
import { FaGithub } from 'react-icons/fa6';
import { beginOAuthRedirect } from '@/lib/oauth';

interface GitHubLoginButtonProps {
  referralCode?: string;
  role?: 'applicant' | 'recruiter';
  disabled?: boolean;
  className?: string;
  onStart?: () => void;
  onComplete?: () => void;
  onError: (message: string) => void;
}

export function GitHubLoginButton({ referralCode, role, disabled, className, onStart, onComplete, onError }: GitHubLoginButtonProps) {
  const roleRef = useRef<typeof role>(role);
  const referralCodeRef = useRef(referralCode);

  useEffect(() => {
    roleRef.current = role;
    referralCodeRef.current = referralCode;
  }, [role, referralCode]);

  const handleClick = async () => {
    onStart?.();
    try {
      await beginOAuthRedirect('github', referralCodeRef.current, roleRef.current);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      onComplete?.();
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={
        className ||
        'flex-1 flex items-center justify-center gap-2 bg-slate-900 border border-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-all font-semibold shadow-sm text-sm disabled:opacity-60 disabled:cursor-not-allowed'
      }
    >
      <FaGithub className="text-white text-base mb-0.5" /> GitHub
    </button>
  );
}
