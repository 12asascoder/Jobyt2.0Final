'use client';

import { FaGithub } from 'react-icons/fa6';
import { beginOAuthRedirect } from '@/lib/oauth';

interface GitHubLoginButtonProps {
  referralCode?: string;
  role?: 'applicant' | 'recruiter';
  disabled?: boolean;
  className?: string;
  onError: (message: string) => void;
}

export function GitHubLoginButton({ referralCode, role, disabled, className, onError }: GitHubLoginButtonProps) {
  const handleClick = async () => {
    try {
      await beginOAuthRedirect('github', referralCode, role);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Login failed. Please try again.');
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
