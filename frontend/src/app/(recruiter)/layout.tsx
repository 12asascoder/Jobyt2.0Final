'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ROUTES } from '@/constants';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { useAuthStore } from '@/store/auth.store';
import {
  FaHouse,
  FaBriefcase,
  FaPlus,
  FaComments,
  FaChartLine,
  FaStar,
  FaArrowRightFromBracket,
  FaBell,
  FaMagnifyingGlass,
  FaXmark,
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
  { label: 'Messages', href: ROUTES.messages, icon: FaComments },
  { label: 'Analytics', href: ROUTES.recruiterAnalytics, icon: FaChartLine },
];

function RecruiterFloatingSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const confirmLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <>
      <aside className="hidden lg:flex fixed left-4 xl:left-8 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-10">
        <div className="bg-[#1a1a1a] rounded-full py-3 px-2 flex flex-col items-center gap-0.5 shadow-2xl">
          {recruiterNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
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

        <div className="bg-[#1a1a1a] rounded-full py-3 px-2 flex flex-col items-center gap-0.5 shadow-2xl">
          <Link
            href={ROUTES.recruiterCredits}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isActive(ROUTES.recruiterCredits)
                ? 'bg-lime-400 text-black'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Credits"
          >
            <FaStar className="text-base" />
          </Link>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-12 h-12 rounded-full text-white/60 hover:text-red-400 flex items-center justify-center transition-colors"
            title="Sign out"
          >
            <FaArrowRightFromBracket className="text-base" />
          </button>
          <Link
            href={ROUTES.profile}
            className={`w-11 h-11 rounded-full overflow-hidden border-2 mt-1 transition-colors ${
              isActive(ROUTES.profile)
                ? 'border-[#c3ff3d]'
                : 'border-white/20 hover:border-white/40'
            }`}
            title="Profile"
          >
            <Image
              src="https://i.pravatar.cc/80?img=47"
              alt="Avatar"
              width={44}
              height={44}
              className="object-cover"
            />
          </Link>
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

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-black border border-[#222] rounded-2xl w-full max-w-sm p-8 text-center shadow-2xl font-brand">
            <h3 className="text-2xl font-bold text-white mb-3 tracking-wide">Log Out?</h3>
            <p className="text-white/60 text-sm mb-8 leading-relaxed">
              Your progress is saved. Come back anytime to manage your jobs and applicants.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-6 py-2.5 rounded-lg border border-white/20 text-white hover:border-white transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-6 py-2.5 rounded-lg bg-[#c3ff3d] text-black font-semibold hover:bg-[#aee62d] transition-colors text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bellActive, setBellActive] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleSearchSubmit = (query: string) => {
    router.push(`${ROUTES.recruiterJobs}?keyword=${encodeURIComponent(query)}`);
    setSearchActive(false);
    setSearchQuery('');
  };

  return (
    <AuthGuard allowedRoles={['recruiter']}>
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] via-[#f9fbf4] to-[#eef7d8]">
        {/* Header with Logo, Search, and Notifications */}
        <header className="sticky top-0 z-50 w-full">
          <div className="mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-10 h-16 md:h-20">
            {/* Logo */}
            <Link href={ROUTES.recruiterDashboard} className="flex items-center gap-2 shrink-0">
              <Image src="/logo.png" alt="Jobyt" width={28} height={28} className="object-contain" />
              <span className="font-display text-xl font-bold text-slate-900 tracking-tight">Jobyt</span>
            </Link>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Desktop: Black outer pill with search + notification */}
              <div className="hidden sm:flex">
                {searchActive ? (
                  /* STATE: Search active */
                  <div className="flex items-center bg-[#1a1a1a] rounded-full h-14 p-1.5 gap-0 min-w-[300px]">
                    {/* Lime search area */}
                    <div className="flex items-center flex-1 bg-lime-400 rounded-full h-full px-4 gap-2.5">
                      <FaMagnifyingGlass className="text-black/70 text-sm shrink-0" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) handleSearchSubmit(searchQuery.trim()); }}
                        placeholder="Search jobs or applicants"
                        autoFocus
                        className="flex-1 bg-transparent text-black placeholder-black/40 text-sm font-semibold outline-none min-w-0"
                      />
                      <button
                        onClick={() => { setSearchActive(false); setSearchQuery(''); }}
                        className="text-black/50 hover:text-black transition-colors"
                      >
                        <FaXmark className="text-sm" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 ml-1 pl-1 relative">
                      <button
                        onClick={() => setBellActive(!bellActive)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          bellActive ? 'bg-lime-400 text-black' : 'text-white/80 hover:text-white'
                        }`}
                      >
                        <FaBell className="text-lg" />
                      </button>
                      {bellActive && <NotificationPopover />}
                    </div>
                  </div>
                ) : (
                  /* STATE: Default */
                  <div className="flex items-center bg-[#1a1a1a] rounded-full h-14 px-2 gap-1 relative">
                    <button
                      onClick={() => setSearchActive(true)}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
                    >
                      <FaMagnifyingGlass className="text-base" />
                    </button>
                    <button
                      onClick={() => setBellActive(!bellActive)}
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                        bellActive ? 'bg-lime-400 text-black' : 'text-white/80 hover:text-white'
                      }`}
                    >
                      <FaBell className="text-lg" />
                    </button>
                    {bellActive && <NotificationPopover />}
                  </div>
                )}
              </div>

              {/* Mobile: Search + Bell */}
              <div className="sm:hidden relative">
                <div className="flex items-center rounded-full h-14 p-1.5 bg-[#1a1a1a] transition-colors gap-1">
                  {searchQuery ? (
                    <div className="flex items-center flex-1 bg-lime-400 rounded-full h-full px-4 gap-2.5">
                      <FaMagnifyingGlass className="text-black/70 text-sm shrink-0" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setSearchActive(true); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) handleSearchSubmit(searchQuery.trim()); }}
                        placeholder="Search"
                        className="flex-1 bg-transparent text-black placeholder-black/40 text-sm font-semibold outline-none min-w-0"
                      />
                      <button
                        onClick={() => { setSearchQuery(''); setSearchActive(false); }}
                        className="text-black/50 hover:text-black transition-colors"
                      >
                        <FaXmark className="text-sm" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center flex-1 px-3 gap-2.5">
                      <FaMagnifyingGlass className="text-white/60 text-sm shrink-0" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setSearchActive(true); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) handleSearchSubmit(searchQuery.trim()); }}
                        placeholder="Search"
                        className="flex-1 bg-transparent text-white placeholder-white/40 text-sm font-medium outline-none min-w-0"
                      />
                    </div>
                  )}
                  {/* Bell inside search pill */}
                  <div className="relative flex shrink-0">
                    <button
                      onClick={() => setBellActive(!bellActive)}
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                        bellActive ? 'bg-lime-400 text-black' : 'text-white/80 hover:text-white'
                      }`}
                    >
                      <FaBell className="text-lg" />
                    </button>
                    {bellActive && <NotificationPopover />}
                  </div>
                </div>
              </div>
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

function NotificationPopover() {
  const [activeTab, setActiveTab] = useState('Today');
  const tabs = ['Today', 'This Week', 'Earlier'];
  const notifications = [
    { id: 1, text: 'You have a new application for Software Engineering Intern.', read: false },
    { id: 2, text: 'Your job posting "Marketing Intern" reached 100 views.', read: false },
    { id: 3, text: 'You have a new message from a candidate.', read: true },
    { id: 4, text: 'Your job "Data Science Intern" is closing soon.', read: true },
    { id: 5, text: 'A candidate has withdrawn their application.', read: true },
  ];
  
  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      className="absolute right-0 top-14 sm:top-16 mt-1 w-[340px] max-w-[calc(100vw-32px)] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-5 z-50 animate-in fade-in slide-in-from-top-2 text-left cursor-auto"
    >
      <h3 className="text-xl font-display font-medium text-slate-900 mb-4">Notifications</h3>
      
      <div className="bg-black rounded-xl p-1.5 flex items-center justify-between mb-5">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === tab 
                ? 'bg-[#c1f237] text-black' 
                : 'text-[#c1f237] hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {notifications.map((notif) => (
          <div key={notif.id} className="bg-[#f8f6f0] rounded-[16px] p-4 flex items-start gap-3">
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${notif.read ? 'bg-[#d9d9d9]' : 'bg-[#c1f237]'}`} />
            <p className="text-slate-700 text-[13px] leading-snug">{notif.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
