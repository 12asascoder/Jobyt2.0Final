'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/constants';
import { useNotifications } from '@/hooks/useNotifications';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FaBell,
    FaArrowRightFromBracket,
} from 'react-icons/fa6';

export const Header = () => {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const { unread, fetchNotifications } = useNotifications();

    useEffect(() => {
        if (user) fetchNotifications();
    }, [user, fetchNotifications]);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    return (
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-sm">
            <div className="mx-auto flex h-16 max-w-full items-center justify-between px-6">
                {/* Logo */}
                <Link href="/" className="shrink-0 flex items-center cursor-pointer group">
                    <div className="relative w-5 h-5 mr-1.5 transition-transform duration-500 group-hover:rotate-180">
                        <div className="absolute inset-0 border-[4px] border-brand-primary rounded-full border-t-transparent -rotate-45" />
                    </div>
                    <span className="font-extrabold text-xl tracking-tight text-slate-900">
                        jobyt<span className="text-brand-primary">.</span>
                    </span>
                </Link>

                {/* Right Actions */}
                {user ? (
                    <div className="flex items-center gap-3">
                        {/* Notification Bell */}
                        <Link
                            href={ROUTES.notifications}
                            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                        >
                            <FaBell className="text-lg" />
                            {unread > 0 && (
                                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm">
                                    {unread > 99 ? '99+' : unread}
                                </span>
                            )}
                        </Link>

                        <div className="h-8 w-px bg-slate-200" />

                        {/* User Avatar */}
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-brand-primary text-sm font-bold shadow-md">
                                {user.email[0].toUpperCase()}
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-sm font-semibold text-slate-800 leading-none">
                                    {user.email.split('@')[0]}
                                </p>
                                <p className="text-[11px] text-slate-400 capitalize mt-0.5">{user.role}</p>
                            </div>
                        </div>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            title="Sign out"
                        >
                            <FaArrowRightFromBracket className="text-sm" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <Link
                            href={ROUTES.login}
                            className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                        >
                            Sign in
                        </Link>
                        <Link
                            href={ROUTES.register}
                            className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-brand-primary hover:text-slate-900 transition-all shadow-sm"
                        >
                            Get started
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
};
