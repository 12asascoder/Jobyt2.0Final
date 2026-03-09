'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ROUTES } from '@/constants';
import { FaBars, FaXmark, FaBell } from 'react-icons/fa6';

export function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [hasNotification, setHasNotification] = useState(true);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
                            <div className="absolute inset-0 border-[5px] border-brand-orange rounded-full border-t-transparent -rotate-45" />
                        </div>
                        <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                            jobyt<span className="text-brand-orange">.</span>
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden lg:flex items-center space-x-10">
                        <Link href="#" className="text-slate-600 hover:text-brand-orange font-semibold transition-colors">
                            Internships
                        </Link>
                        <Link href="#" className="text-slate-600 hover:text-brand-orange font-semibold transition-colors">
                            Jobs
                        </Link>
                        <Link href="#" className="text-slate-600 hover:text-brand-orange font-semibold transition-colors">
                            Mentorship
                        </Link>

                        {/* Notification Bell */}
                        <button
                            className="relative text-slate-600 hover:text-brand-orange transition-colors"
                            onClick={() => setHasNotification(false)}
                            aria-label="Notifications"
                        >
                            <FaBell className="text-xl" />
                            {hasNotification && (
                                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                            )}
                        </button>

                        <div className="h-6 w-px bg-slate-200" />
                        <Link href={ROUTES.login} className="text-slate-800 font-bold hover:text-brand-orange transition-colors">
                            Log in
                        </Link>
                        <Link
                            href={ROUTES.register}
                            className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-brand-orange hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-95 duration-300"
                        >
                            Sign up
                        </Link>
                    </div>

                    {/* Mobile Button */}
                    <div className="lg:hidden flex items-center">
                        <button
                            onClick={() => setMobileOpen((v) => !v)}
                            className="text-slate-600 hover:text-brand-orange focus:outline-none p-2 transition-colors"
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
                        <Link href="#" className="block px-4 py-3 text-lg font-semibold text-slate-700 hover:text-brand-orange hover:bg-orange-50 rounded-xl transition-colors">
                            Internships
                        </Link>
                        <Link href="#" className="block px-4 py-3 text-lg font-semibold text-slate-700 hover:text-brand-orange hover:bg-orange-50 rounded-xl transition-colors">
                            Jobs
                        </Link>
                        <Link href="#" className="block px-4 py-3 text-lg font-semibold text-slate-700 hover:text-brand-orange hover:bg-orange-50 rounded-xl transition-colors">
                            Mentorship
                        </Link>
                        <div className="border-t border-slate-100 mt-4 pt-4 space-y-3">
                            <Link
                                href={ROUTES.login}
                                className="block w-full text-center px-4 py-3 text-lg font-bold text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Log in
                            </Link>
                            <Link
                                href={ROUTES.register}
                                className="block w-full text-center bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-brand-orange transition-colors shadow-lg"
                            >
                                Sign up
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
