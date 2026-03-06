'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/constants';
import { cn } from '@/lib/utils';

interface NavItem { label: string; href: string; icon: string; }

const applicantNav: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.dashboard, icon: '🏠' },
  { label: 'Find Jobs', href: ROUTES.jobs, icon: '🔍' },
  { label: 'Applications', href: ROUTES.applications, icon: '📋' },
  { label: 'Saved Jobs', href: ROUTES.savedJobs, icon: '🔖' },
  { label: 'Messages', href: ROUTES.messages, icon: '💬' },
  { label: 'Credits', href: ROUTES.credits, icon: '💳' },
  { label: 'Profile', href: ROUTES.profile, icon: '👤' },
];

const recruiterNav: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.recruiterDashboard, icon: '🏠' },
  { label: 'My Jobs', href: ROUTES.recruiterJobs, icon: '📌' },
  { label: 'Post a Job', href: ROUTES.recruiterNewJob, icon: '➕' },
  { label: 'Messages', href: ROUTES.messages, icon: '💬' },
  { label: 'Analytics', href: ROUTES.recruiterAnalytics, icon: '📊' },
  { label: 'Credits', href: ROUTES.recruiterCredits, icon: '💳' },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.adminDashboard, icon: '🏠' },
  { label: 'Users', href: ROUTES.adminUsers, icon: '👥' },
  { label: 'Jobs', href: ROUTES.adminJobs, icon: '📌' },
  { label: 'Credits', href: ROUTES.adminCredits, icon: '💳' },
];

export const Sidebar = () => {
  const { user } = useAuthStore();
  const pathname = usePathname();

  const nav =
    user?.role === 'recruiter' ? recruiterNav :
    user?.role === 'admin' ? adminNav :
    applicantNav;

  return (
    <aside className="flex h-full w-56 flex-col border-r border-gray-200 bg-white px-3 py-6">
      <nav className="flex flex-col gap-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
};
