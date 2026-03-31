'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ROUTES } from '@/constants';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { Modal } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  FaHouse,
  FaBriefcase,
  FaPlus,
  FaComments,
  FaChartLine,
  FaCreditCard,
  FaBell,
  FaMagnifyingGlass,
  FaArrowRightFromBracket,
} from 'react-icons/fa6';

interface RecruiterNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const recruiterNav: RecruiterNavItem[] = [
  { label: 'Home', href: ROUTES.recruiterDashboard, icon: FaHouse },
  { label: 'My Jobs', href: ROUTES.recruiterJobs, icon: FaBriefcase },
  { label: 'Post', href: ROUTES.recruiterNewJob, icon: FaPlus },
  { label: 'Messages', href: ROUTES.recruiterMessages, icon: FaComments },
  { label: 'Analytics', href: ROUTES.recruiterAnalytics, icon: FaChartLine },
  { label: 'Credits', href: ROUTES.recruiterCredits, icon: FaCreditCard },
];

function RecruiterFloatingSidebar() {
  const pathname = usePathname();
  const { user, logoutWithApi } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadBalance = async () => {
      try {
        const res = await api.get<{ balance: number }>('/credits/balance');
        if (mounted) {
          setCreditBalance(res.data?.balance ?? 0);
        }
      } catch {
        if (mounted) {
          setCreditBalance(0);
        }
      }
    };

    loadBalance();
    const timer = setInterval(loadBalance, 30000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    await logoutWithApi();
    setIsLoggingOut(false);
  };

  const userInitial = user?.email?.trim()?.charAt(0)?.toUpperCase() || 'U';
  const profileActive = pathname === ROUTES.recruiterProfile || pathname.startsWith(`${ROUTES.recruiterProfile}/`);

  return (
    <>
      <aside className="hidden lg:flex fixed left-4 xl:left-8 top-1/2 -translate-y-1/2 z-40 flex-col items-center">
        <div className="bg-[#1a1a1a] rounded-full py-3 px-2 flex flex-col items-center gap-0.5 shadow-2xl">
          {recruiterNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  active ? 'bg-lime-400 text-black' : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="text-lg" />
              </Link>
            );
          })}
        </div>
      </aside>

      <aside className="hidden lg:flex fixed left-4 xl:left-8 bottom-8 z-40 flex-col items-center">
        <div className="bg-[#1a1a1a] rounded-full py-3 px-2 flex flex-col items-center gap-2 shadow-2xl">
          <Link
            href={ROUTES.recruiterCredits}
            title="Credits"
            className="w-12 h-12 rounded-full flex items-center justify-center text-lime-300 hover:bg-white/10"
          >
            <FaCreditCard className="text-lg" />
          </Link>

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            title="Logout"
            className="w-12 h-12 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10"
          >
            <FaArrowRightFromBracket className="text-lg" />
          </button>

          <Link
            href={ROUTES.recruiterProfile}
            title="Profile"
            className={`w-10 h-10 rounded-full text-xs font-bold flex items-center justify-center border-2 transition-colors ${
              profileActive
                ? 'bg-lime-400 text-black border-lime-400'
                : 'bg-blue-700 text-white border-black hover:bg-blue-600'
            }`}
          >
            {userInitial}
          </Link>
          <p className="text-[10px] font-bold text-lime-300 leading-none">{creditBalance}</p>
        </div>
      </aside>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a]">
        <div className="flex items-center justify-around px-3 h-[68px]">
          {recruiterNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} title={item.label} className="flex flex-col items-center gap-1 py-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    active ? 'bg-lime-400 text-black' : 'text-white/50 hover:text-white'
                  }`}
                >
                  <Icon className="text-[17px]" />
                </div>
                <span className={`text-[9px] font-semibold leading-none ${active ? 'text-lime-400' : 'text-white/40'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} title="Log out?">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">You will be signed out from this device.</p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              disabled={isLoggingOut}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmLogout}
              className="px-4 py-2 rounded-lg bg-black text-lime-300 hover:bg-slate-900 disabled:opacity-60"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Log out'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['recruiter']}>
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] via-[#f9fbf4] to-[#eef7d8]">
        <header className="sticky top-0 z-30 px-4 sm:px-6 lg:px-10 py-4">
          <div className="mx-auto flex items-center justify-between">
            <Link href={ROUTES.recruiterDashboard} className="inline-flex items-center gap-2">
              <Image src="/logo.png" alt="Jobyt" width={28} height={28} className="object-contain" />
              <span className="font-display text-xl font-bold text-slate-900 tracking-tight">Jobyt</span>
            </Link>

            <div className="inline-flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-3 rounded-full bg-black text-white px-4 py-2"
                title="Search and notifications"
              >
                <FaMagnifyingGlass className="text-sm" />
                <FaBell className="text-sm" />
              </button>
              <Link
                href={ROUTES.recruiterNewJob}
                className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center"
                title="Post a job"
              >
                <FaPlus className="text-sm" />
              </Link>
            </div>
          </div>
        </header>

        <RecruiterFloatingSidebar />

        <main className="lg:pl-24 xl:pl-28 pb-24 lg:pb-8 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
