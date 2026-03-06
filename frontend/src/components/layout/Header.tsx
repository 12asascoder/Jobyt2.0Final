'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { Avatar, Badge } from '@/components/ui';
import { ROUTES, APP_NAME } from '@/constants';
import { useNotifications } from '@/hooks/useNotifications';
import { useEffect } from 'react';

export const Header = () => {
  const { user, logout } = useAuthStore();
  const { unread, fetchNotifications } = useNotifications();

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user, fetchNotifications]);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href={ROUTES.home} className="text-xl font-bold text-blue-600">
          {APP_NAME}
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            <Link href={ROUTES.notifications} className="relative text-gray-500 hover:text-gray-900">
              🔔
              {unread > 0 && (
                <Badge variant="danger" className="absolute -right-2 -top-2 h-4 min-w-4 px-1 text-[10px]">
                  {unread}
                </Badge>
              )}
            </Link>
            <div className="flex items-center gap-2">
              <Avatar size="sm" name={user.email} />
              <span className="text-sm font-medium text-gray-700">{user.email}</span>
            </div>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600">
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href={ROUTES.login} className="text-sm font-medium text-gray-700 hover:text-blue-600">
              Sign in
            </Link>
            <Link href={ROUTES.register} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
