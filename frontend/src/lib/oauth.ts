import { api } from '@/lib/api';
import { AuthTokens, AuthUser } from '@/types';

export type OAuthProvider = 'google' | 'github' | 'linkedin';

const OAUTH_STATE_KEY_PREFIX = 'oauth_state';
const OAUTH_REFERRAL_KEY = 'oauth_referral_code';

export interface OAuthResponseData {
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
  };
  requiresEmail?: boolean;
  requiresVerification?: boolean;
}

export interface ParsedOAuthResult {
  user?: AuthUser;
  tokens?: AuthTokens;
  requiresEmail: boolean;
  requiresVerification: boolean;
}

export const readPublicEnv = (name: string): string | undefined => {
  const publicEnv: Record<string, string | undefined> = {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_GITHUB_CLIENT_ID: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
    NEXT_PUBLIC_LINKEDIN_CLIENT_ID: process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID,
    NEXT_PUBLIC_OAUTH_REDIRECT_URI: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI,
  };

  return publicEnv[name];
};

export const parseOAuthResponse = (payload: OAuthResponseData | undefined): ParsedOAuthResult => {
  const accessToken = payload?.accessToken ?? payload?.tokens?.accessToken;
  const refreshToken = payload?.refreshToken ?? payload?.tokens?.refreshToken;

  const hasTokens = Boolean(accessToken && refreshToken);

  return {
    user: payload?.user,
    tokens: hasTokens
      ? {
          accessToken: accessToken as string,
          refreshToken: refreshToken as string,
        }
      : undefined,
    requiresEmail: Boolean(payload?.requiresEmail),
    requiresVerification: Boolean(payload?.requiresVerification),
  };
};

export const getOAuthRedirectUri = () => {
  if (typeof window === 'undefined') return '';
  return readPublicEnv('NEXT_PUBLIC_OAUTH_REDIRECT_URI') || `${window.location.origin}/oauth/callback`;
};

export const saveOAuthState = (provider: Exclude<OAuthProvider, 'google'>, state: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${OAUTH_STATE_KEY_PREFIX}:${provider}`, state);
};

export const readOAuthState = (provider: Exclude<OAuthProvider, 'google'>) => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${OAUTH_STATE_KEY_PREFIX}:${provider}`);
};

export const clearOAuthState = (provider: Exclude<OAuthProvider, 'google'>) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${OAUTH_STATE_KEY_PREFIX}:${provider}`);
};

export const saveOAuthReferralCode = (referralCode?: string) => {
  if (typeof window === 'undefined') return;
  if (referralCode?.trim()) {
    localStorage.setItem(OAUTH_REFERRAL_KEY, referralCode.trim());
    return;
  }
  localStorage.removeItem(OAUTH_REFERRAL_KEY);
};

export const getOAuthReferralCode = () => {
  if (typeof window === 'undefined') return undefined;
  const value = localStorage.getItem(OAUTH_REFERRAL_KEY);
  return value?.trim() ? value.trim() : undefined;
};

export const clearOAuthReferralCode = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OAUTH_REFERRAL_KEY);
};

const buildState = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
};

export const beginOAuthRedirect = async (
  provider: Exclude<OAuthProvider, 'google'>,
  referralCode?: string,
) => {
  const state = buildState();
  const baseRedirect = getOAuthRedirectUri();
  const callbackWithProvider = `${baseRedirect}${baseRedirect.includes('?') ? '&' : '?'}provider=${provider}`;
  const redirectUri = encodeURIComponent(callbackWithProvider);

  saveOAuthState(provider, state);
  saveOAuthReferralCode(referralCode);

  await api.post('/auth/oauth/state', { provider, state });

  if (provider === 'github') {
    const clientId = readPublicEnv('NEXT_PUBLIC_GITHUB_CLIENT_ID');
    if (!clientId) throw new Error('GitHub OAuth is not configured. Missing NEXT_PUBLIC_GITHUB_CLIENT_ID.');

    const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=user:email&state=${encodeURIComponent(state)}&redirect_uri=${redirectUri}`;
    window.location.href = url;
    return;
  }

  const clientId = readPublicEnv('NEXT_PUBLIC_LINKEDIN_CLIENT_ID');
  if (!clientId) throw new Error('LinkedIn OAuth is not configured. Missing NEXT_PUBLIC_LINKEDIN_CLIENT_ID.');

  const scope = encodeURIComponent('openid profile email');
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${encodeURIComponent(clientId)}&state=${encodeURIComponent(state)}&redirect_uri=${redirectUri}&scope=${scope}`;
  window.location.href = url;
};
