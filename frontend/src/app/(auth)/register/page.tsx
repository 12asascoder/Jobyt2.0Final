'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { ROUTES, APP_NAME } from '@/constants';
import { UserRole } from '@/types';
import { FaGoogle, FaApple, FaArrowRight, FaEnvelopeCircleCheck } from 'react-icons/fa6';
import Image from 'next/image';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', role: 'applicant' as UserRole, referralCode: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await api.post('/auth/register', form);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const RightVisualSection = () => (
    <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden p-12 h-full">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-orange/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-blue/20 rounded-full blur-[120px]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <div className="relative z-10 max-w-lg">
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-10 shadow-2xl relative">
          <svg className="absolute top-6 left-6 text-brand-orange/40 w-12 h-12 -translate-y-4 -translate-x-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <p className="text-xl leading-relaxed text-white font-medium relative z-10 mb-8 mt-2">
            "Jobyt's platform made it effortless to showcase my skills. The matching algorithm is incredibly accurate, and I'm thrilled to have joined Google!"
          </p>
          <div className="flex items-center gap-4">
            <Image
              src="https://media.licdn.com/dms/image/v2/D5603AQHmXTkx3bJ0SA/profile-displayphoto-scale_400_400/B56ZwN7O8zIQAk-/0/1769760158482?e=1774483200&v=beta&t=qvFbTxXUT0mJvYNUM2YuQmdASe0FomTnc3qXO67lW4Q"
              alt="Sourav"
              width={56}
              height={56}
              className="w-12 h-12 rounded-full border-2 border-white/20 object-cover"
              unoptimized
            />
            <div>
              <h4 className="font-bold text-white tracking-wide">Sourav</h4>
              <p className="text-slate-400 text-sm font-medium">Software Engineer at Google</p>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-8 -right-8 bg-white text-slate-900 rounded-2xl p-4 shadow-xl border border-slate-100 flex items-center gap-4 animate-float">
          <div className="bg-brand-blue/10 text-brand-blue p-2 rounded-xl text-xl font-black">150+</div>
          <div>
            <p className="font-extrabold text-sm">Free Credits</p>
            <p className="text-slate-500 text-xs font-semibold">On successful signup</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen lg:h-screen bg-[#fcfcfc] flex flex-col lg:flex-row lg:overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-6 md:p-8 z-10 py-8 lg:py-0 lg:overflow-y-auto h-full">
          <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden text-center my-auto">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-orange to-brand-coral" />
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaEnvelopeCircleCheck className="text-4xl text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Check your email</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              We've sent a secure verification link to <strong className="text-slate-800">{form.email}</strong>. Click it to activate your account.
            </p>
            <button
              onClick={() => router.push(ROUTES.login)}
              className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 font-bold text-base hover:bg-slate-800 transition-all shadow-md group flex items-center justify-center gap-2"
            >
              Back to sign in <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
        <RightVisualSection />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-[#fcfcfc] flex flex-col lg:flex-row lg:overflow-hidden">
      {/* Left Form Section */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 z-10 py-8 lg:py-0 lg:overflow-y-auto h-full">
        <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden my-auto">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-orange to-brand-coral" />

          <div className="mb-6 text-center">
            <Link href={ROUTES.home} className="inline-block mb-3">
              <span className="text-2xl md:text-3xl font-extrabold tracking-tighter">
                Joby<span className="text-brand-orange">t</span>
              </span>
            </Link>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Create an account</h1>
            <p className="text-slate-500 mt-1.5 font-medium text-sm">Join {APP_NAME} today. 150 free credits on sign-up!</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold shadow-sm text-sm">
              <FaGoogle className="text-red-500 text-base" /> Google
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 bg-slate-900 border border-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-all font-semibold shadow-sm text-sm">
              <FaApple className="text-white text-base mb-0.5" /> Apple
            </button>
          </div>

          <div className="relative flex items-center py-1 mb-5">
            <div className="flex-1 border-t border-slate-200" />
            <span className="shrink-0 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white">
              Or sign up with email
            </span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-red-50/80 border border-red-100 p-3 text-sm text-red-600 font-medium flex items-start gap-3">
              <span className="text-lg leading-none">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                placeholder="you@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                required
                placeholder="Minimum 8 characters"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1">I am a...</label>
              <select
                value={form.role}
                onChange={set('role')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all font-medium text-slate-900 appearance-none cursor-pointer text-sm"
              >
                <option value="applicant">Job seeker / Student</option>
                <option value="recruiter">Recruiter / Employer</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1 text-slate-500">Referral Code (optional)</label>
              <input
                type="text"
                value={form.referralCode}
                onChange={set('referralCode')}
                placeholder="e.g. A3F9C2"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-brand-orange text-white rounded-xl px-4 py-3 font-bold text-base hover:bg-orange-600 transition-all shadow-[0_8px_20px_rgba(255,107,0,0.25)] hover:shadow-[0_12px_25px_rgba(255,107,0,0.35)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:transform-none flex items-center justify-center gap-2 group"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
              {!isLoading && <FaArrowRight className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px] font-medium text-slate-500">
            Already have an account?{' '}
            <Link href={ROUTES.login} className="font-bold text-brand-orange hover:text-orange-600 transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      <RightVisualSection />
    </div>
  );
}
