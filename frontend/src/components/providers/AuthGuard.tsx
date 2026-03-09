'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.login);
      return;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // Redirect to correct dashboard based on role
      const dest =
        user.role === 'recruiter' ? ROUTES.recruiterDashboard :
        user.role === 'admin' ? ROUTES.adminDashboard :
        ROUTES.dashboard;
      router.replace(dest);
    }
  }, [isAuthenticated, user, allowedRoles, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
