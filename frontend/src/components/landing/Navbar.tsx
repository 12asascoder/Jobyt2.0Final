'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/auth.store';
import { FaBars, FaXmark, FaBell } from 'react-icons/fa6';

export function Navbar() {
    const { user } = useAuthStore();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const getDashboardRoute = () => {
        if (!user) return ROUTES.dashboard;
        if (user.role === 'recruiter') return ROUTES.recruiterDashboard;
        if (user.role === 'admin') return ROUTES.adminDashboard;
        return ROUTES.dashboard;
    };

    return (
        <nav
            className={`fixed w-full top-0 z-50 transition-all duration-300 ${scrolled ? 'glass-nav shadow-md' : ''
                }`}
            style={{ background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent' }}
        >
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <Link href="/" className="shrink-0 flex items-center cursor-pointer group">
                        <div className="relative w-6 h-6 mr-2 transition-transform duration-500 group-hover:rotate-180">
                            <div className="absolute inset-0 border-[5px] border-brand-primary rounded-full border-t-transparent -rotate-45" />
                        </div>
                        <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                            jobyt<span className="text-brand-primary">.</span>
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden lg:flex items-center space-x-10">
                        <Link href="/jobs?type=internship" className="relative text-slate-600 font-semibold transition-colors group">
                            Internships
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all duration-300 group-hover:w-[70%]"></span>
                        </Link>
                        <Link href="/jobs" className="relative text-slate-600 font-semibold transition-colors group">
                            Jobs
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all duration-300 group-hover:w-[70%]"></span>
                        </Link>

                        {/* Auth-dependent actions */}
                        {user ? (
                            <>
                                {/* Notification Bell - Only when logged in */}
                                <Link
                                    href={ROUTES.notifications}
                                    className="relative inline-block text-slate-600 hover:scale-110 transition-transform"
                                    aria-label="Notifications"
                                >
                                    <FaBell className="text-xl" />
                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                                </Link>
                                <div className="h-6 w-px bg-slate-200" />
                                <Link
                                    href={getDashboardRoute()}
                                    className="flex items-center gap-2 text-slate-800 font-bold hover:text-brand-primary transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-brand-primary text-sm font-bold">
                                        {user.email[0].toUpperCase()}
                                    </div>
                                    <span className="text-sm">Dashboard</span>
                                </Link>
                            </>
                        ) : (
                            <>
                                <div className="h-6 w-px bg-slate-200" />
                                <Link href={ROUTES.login} className="text-slate-800 font-bold inline-block hover:scale-105 transition-transform">
                                    Log in
                                </Link>
                                <Link
                                    href={ROUTES.register}
                                    className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-brand-primary hover:text-slate-900 hover:shadow-lg hover:shadow-brand-primary/30 transition-all active:scale-95 duration-300"
                                >
                                    Sign up
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Button */}
                    <div className="lg:hidden flex items-center gap-3">
                        {user && (
                            <Link href={ROUTES.notifications} className="relative text-slate-600">
                                <FaBell className="text-lg" />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-white rounded-full"></span>
                            </Link>
                        )}
                        <button
                            onClick={() => setMobileOpen((v) => !v)}
                            className="text-slate-600 hover:text-brand-primary focus:outline-none p-2 transition-colors"
                        >
                            {mobileOpen ? <FaXmark className="text-2xl" /> : <FaBars className="text-2xl" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-slate-100 absolute w-full shadow-2xl transition-all duration-300">
                    <div className="px-6 pt-4 pb-8 space-y-3">
                        <Link
                            href="/jobs?type=internship"
                            className="block px-4 py-3 text-lg font-semibold text-slate-700 hover:bg-brand-primary/20 rounded-xl transition-colors"
                            onClick={() => setMobileOpen(false)}
                        >
                            Internships
                        </Link>
                        <Link
                            href="/jobs"
                            className="block px-4 py-3 text-lg font-semibold text-slate-700 hover:bg-brand-primary/20 rounded-xl transition-colors"
                            onClick={() => setMobileOpen(false)}
                        >
                            Jobs
                        </Link>

                        <div className="border-t border-slate-100 mt-4 pt-4 space-y-3">
                            {user ? (
                                <Link
                                    href={getDashboardRoute()}
                                    className="block w-full text-center bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-brand-primary hover:text-slate-900 transition-colors shadow-lg"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={ROUTES.login}
                                        className="block w-full text-center px-4 py-3 text-lg font-bold text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={ROUTES.register}
                                        className="block w-full text-center bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-brand-primary hover:text-slate-900 transition-colors shadow-lg"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        Sign up
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
