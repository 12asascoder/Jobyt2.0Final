'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/constants';
import { ApiError } from '@/lib/api';
import { FaArrowRight } from 'react-icons/fa6';
import Image from 'next/image';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { GitHubLoginButton } from '@/components/auth/GitHubLoginButton';
import { LinkedInLoginButton } from '@/components/auth/LinkedInLoginButton';
import { AuthTokens, AuthUser } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isEmployerLogin = pathname.includes('employer-login');
  const signupRoute = isEmployerLogin ? ROUTES.employerSignup : ROUTES.userSignup;
  const login = useAuthStore((s) => s.login);
  const setSession = useAuthStore((s) => s.setSession);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const routeByRole = (user: AuthUser) =>
    user.role === 'recruiter'
      ? ROUTES.recruiterDashboard
      : user.role === 'admin'
        ? ROUTES.adminDashboard
        : ROUTES.dashboard;

  const handleAuthSuccess = (tokens: AuthTokens, user: AuthUser) => {
    setSession(tokens.accessToken, tokens.refreshToken, user);
    if (!user.email) {
      router.push(ROUTES.addEmail);
      return;
    }
    router.push(routeByRole(user));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      router.push(routeByRole(user));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen lg:h-screen bg-[#fcfcfc] flex flex-col lg:flex-row lg:overflow-hidden">
      {/* Left Form Section */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 z-10 py-8 lg:py-0 lg:overflow-y-auto h-full">
        <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden my-auto">
          {/* Subtle top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-primary to-brand-coral" />

          <div className="mb-8 text-center">
            <Link href={ROUTES.home} className="inline-block mb-4">
              <span className="text-3xl font-extrabold tracking-tighter">
                Joby<span className="text-brand-primary">t</span>
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-slate-500 mt-2 font-medium">Log in to your account to continue</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <Link
              href={ROUTES.login}
              className={`text-center rounded-xl px-3 py-2 text-xs font-semibold border transition-colors ${
                !isEmployerLogin
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              User Login
            </Link>
            <Link
              href={ROUTES.employerLogin}
              className={`text-center rounded-xl px-3 py-2 text-xs font-semibold border transition-colors ${
                isEmployerLogin
                  ? 'border-lime-400 bg-lime-300 text-slate-900'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              Employer Login
            </Link>
          </div>

          <div className="text-center mb-5">
            <Link href={signupRoute} className="text-xs font-semibold text-brand-blue hover:text-blue-700 transition-colors">
              Don&apos;t have an account? Create one
            </Link>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <GoogleLoginButton
              onSuccess={handleAuthSuccess}
              onRequiresEmail={() => router.push(ROUTES.addEmail)}
              onRequiresVerification={() => router.push(`${ROUTES.verifyEmail}?pending=1`)}
              onError={setError}
            />
            <GitHubLoginButton onError={setError} />
            <LinkedInLoginButton onError={setError} className="sm:col-span-2 flex items-center justify-center gap-2 bg-[#0a66c2] border border-[#0a66c2] text-white px-4 py-2 rounded-xl hover:bg-[#08549d] transition-all font-semibold shadow-sm text-sm" />
          </div>

          <div className="relative flex items-center py-2 mb-6">
            <div className="flex-1 border-t border-slate-200" />
            <span className="shrink-0 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white">
              Or continue with email
            </span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-50/80 border border-red-100 p-3 text-sm text-red-600 font-medium flex items-start gap-3">
              <span className="text-lg leading-none">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[13px] font-bold text-slate-700">Password</label>
                <Link href={ROUTES.forgotPassword} className="text-[11px] font-bold text-brand-blue hover:text-blue-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-slate-900 text-brand-primary rounded-xl px-4 py-3 font-bold text-base hover:bg-slate-800 transition-all shadow-[0_8px_20px_rgba(15,23,42,0.25)] hover:shadow-[0_12px_25px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:transform-none flex items-center justify-center gap-2 group"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              {!isLoading && <FaArrowRight className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] font-medium text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href={signupRoute} className="font-bold text-brand-primary hover:text-orange-600 transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Right Visual Section (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden p-12 h-full">
        {/* Glow Effects */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-blue/20 rounded-full blur-[120px]" />

        {/* Graphic Overlay Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 max-w-lg">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-10 shadow-2xl relative">
            <svg className="absolute top-6 left-6 text-brand-primary/40 w-12 h-12 -translate-y-4 -translate-x-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <p className="text-xl leading-relaxed text-white font-medium relative z-10 mb-8 mt-2">
              &quot;The platform&apos;s direct referral system is a game-changer. I landed my dream role at Amazon within weeks of creating my profile. Highly recommended!&quot;
            </p>
            <div className="flex items-center gap-4">
              <Image
                src="https://media.licdn.com/dms/image/v2/D5603AQE-R4BTnUDv9w/profile-displayphoto-crop_800_800/B56ZkZBrR7IAAI-/0/1757061495078?e=1774483200&v=beta&t=F8KZTCgZ62Lr8Q-keJAVc3SbIXGVDPe0TK7r27md53E"
                alt="Ayush"
                width={56}
                height={56}
                className="w-12 h-12 rounded-full border-2 border-white/20 object-cover"
                unoptimized
              />
              <div>
                <h4 className="font-bold text-white tracking-wide">Ayush</h4>
                <p className="text-slate-400 text-sm font-medium">SDE at Amazon</p>
              </div>
            </div>
          </div>

          {/* Stats Badges */}
          <div className="absolute -bottom-8 -right-8 bg-white text-slate-900 rounded-2xl p-4 shadow-xl border border-slate-100 flex items-center gap-4 animate-float">
            <div className="bg-green-100 text-green-600 p-2 rounded-xl text-xl font-black">10k+</div>
            <div>
              <p className="font-extrabold text-sm">Hired this month</p>
              <p className="text-slate-500 text-xs font-semibold">Across 500+ companies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
