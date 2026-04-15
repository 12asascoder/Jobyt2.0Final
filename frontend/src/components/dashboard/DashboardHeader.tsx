'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FaBell, FaMagnifyingGlass, FaXmark, FaUser, FaArrowRightFromBracket, FaBars, FaStar } from 'react-icons/fa6';
import { useNotifications } from '@/hooks/useNotifications';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/auth.store';

interface DashboardHeaderProps {
    searchQuery: string;
    onSearchChange: (q: string) => void;
    searchActive: boolean;
    onSearchToggle: (active: boolean) => void;
    onSearchSubmit?: (query: string) => void;
}

export function DashboardHeader({
    searchQuery,
    onSearchChange,
    searchActive,
    onSearchToggle,
    onSearchSubmit,
}: DashboardHeaderProps) {
    const router = useRouter();
    const logoutWithApi = useAuthStore((s) => s.logoutWithApi);
    const [bellActive, setBellActive] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);

    const handleMobileLogout = async () => {
        setMobileMenuOpen(false);
        setBellActive(false);
        await logoutWithApi();
        router.replace(ROUTES.login);
    };

    useEffect(() => {
        lastScrollY.current = window.scrollY;

        const onScroll = () => {
            const currentY = window.scrollY;
            const delta = currentY - lastScrollY.current;

            if (currentY <= 8) {
                setIsHeaderVisible(true);
            } else if (delta > 6) {
                setIsHeaderVisible(false);
            } else if (delta < -6) {
                setIsHeaderVisible(true);
            }

            lastScrollY.current = currentY;
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={`fixed inset-x-0 top-0 z-50 w-full bg-[#f7f7f7]/95 backdrop-blur-sm border-b border-black/5 transition-all duration-300 ${
                isHeaderVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
            }`}
        >
            {/* ── Row 1: Logo + search + notifications ── */}
            <div className="mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-10 h-16 md:h-20">
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
                    <Image src="/logo.png" alt="Jobyt" width={28} height={28} className="object-contain" />
                    <span className="font-display text-xl font-bold text-slate-900 tracking-tight">Jobyt</span>
                </Link>

                {/* Right Actions */}
                <div className="flex items-center gap-3">

                    {/* ── Desktop/Tablet: Black outer pill with 3 states ── */}
                    <div className="hidden sm:flex">
                        {searchActive ? (
                            /* STATE: Search active — black pill wrapping lime search + black bell */
                            <div className="flex items-center bg-[#1a1a1a] rounded-full h-14 p-1.5 gap-0 min-w-[300px]">
                                {/* Lime search area */}
                                <div className="flex items-center flex-1 bg-lime-400 rounded-full h-full px-4 gap-2.5">
                                    <FaMagnifyingGlass className="text-black/70 text-sm shrink-0" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim() && onSearchSubmit) onSearchSubmit(searchQuery.trim()); }}
                                        placeholder="Search"
                                        autoFocus
                                        className="flex-1 bg-transparent text-black placeholder-black/40 text-sm font-semibold outline-none min-w-0"
                                    />
                                    <button
                                        onClick={() => { onSearchToggle(false); onSearchChange(''); }}
                                        className="text-black/50 hover:text-black transition-colors"
                                    >
                                        <FaXmark className="text-sm" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-1 ml-1 pl-1 relative">
                                    <button
                                        onClick={() => {
                                            const nextActive = !bellActive;
                                            setBellActive(nextActive);
                                            if (nextActive) onSearchToggle(false);
                                        }}
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
                            /* STATE: Default / Notification — solid black pill */
                            <div className="flex items-center bg-[#1a1a1a] rounded-full h-14 px-2 gap-1 relative">
                                <button
                                    onClick={() => {
                                        onSearchToggle(true);
                                        setBellActive(false);
                                    }}
                                    className="w-11 h-11 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
                                >
                                    <FaMagnifyingGlass className="text-base" />
                                </button>
                                <button
                                    onClick={() => setBellActive(!bellActive)}
                                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                                        bellActive
                                            ? 'bg-lime-400 text-black'
                                            : 'text-white/80 hover:text-white'
                                    }`}
                                >
                                    <FaBell className="text-lg" />
                                </button>
                                {bellActive && <NotificationPopover />}
                            </div>
                        )}
                    </div>

                    {/* Mobile: Profile Dropdown (Replaces Bell) */}
                    <div className="sm:hidden relative">
                        <button
                            onClick={() => {
                                setMobileMenuOpen((prev) => !prev);
                                setBellActive(false);
                            }}
                            className="w-11 h-11 bg-[#1a1a1a] rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
                            aria-label="Open menu"
                        >
                            {mobileMenuOpen ? <FaXmark className="text-base" /> : <FaBars className="text-sm" />}
                        </button>

                        {/* Mobile Menu */}
                        {mobileMenuOpen && (
                            <div className="absolute right-0 top-14 mt-2 w-[min(88vw,340px)] bg-white rounded-2xl shadow-xl border border-slate-100 p-3 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center rounded-full h-12 p-1 bg-[#1a1a1a] gap-1 mb-3">
                                    <div className="flex items-center flex-1 px-3 gap-2">
                                        <FaMagnifyingGlass className="text-white/60 text-sm shrink-0" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                onSearchChange(e.target.value);
                                                onSearchToggle(Boolean(e.target.value));
                                            }}
                                            onFocus={() => setBellActive(false)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && searchQuery.trim() && onSearchSubmit) {
                                                    onSearchSubmit(searchQuery.trim());
                                                    setMobileMenuOpen(false);
                                                }
                                            }}
                                            placeholder="Search"
                                            className="flex-1 bg-transparent text-white placeholder-white/40 text-sm font-medium outline-none min-w-0"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setBellActive(!bellActive)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                            bellActive ? 'bg-lime-400 text-black' : 'text-white/80 hover:text-white'
                                        }`}
                                        aria-label="Toggle notifications"
                                    >
                                        <FaBell className="text-base" />
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    <Link
                                        href="/credits"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700"
                                    >
                                        <FaStar className="text-slate-400" />
                                        Credits
                                    </Link>

                                    <Link
                                        href="/profile"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700"
                                    >
                                        <FaUser className="text-slate-400" />
                                        Profile
                                    </Link>

                                    <button
                                        onClick={() => {
                                            void handleMobileLogout();
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                    >
                                        <FaArrowRightFromBracket className="text-red-400" />
                                        Logout
                                    </button>
                                </div>

                                {bellActive && <NotificationPopover />}
                            </div>
                        )}
                    </div>

                </div>
            </div>

        </header>
    );
}

const NotificationPopover = () => {
    const { notifications, unread, isLoading, fetchNotifications, markRead, markAllRead } = useNotifications();

    useEffect(() => {
        void fetchNotifications(1);
    }, [fetchNotifications]);

    const handleNotificationClick = async (id: string, actionUrl?: string | null, read?: boolean) => {
        if (!read) {
            await markRead(id);
        }
        if (actionUrl) {
            window.location.assign(actionUrl);
        }
    };
    
    return (
        <div 
            onClick={(e) => e.stopPropagation()} 
            className="absolute right-0 top-14 sm:top-16 mt-1 w-[340px] max-w-[calc(100vw-32px)] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-5 z-50 animate-in fade-in slide-in-from-top-2 text-left cursor-auto"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-display font-medium text-slate-900">Notifications {unread > 0 ? `(${unread})` : ''}</h3>
                {unread > 0 && (
                    <button
                        onClick={() => void markAllRead()}
                        className="text-xs font-semibold text-lime-700 hover:text-lime-800"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {isLoading ? (
                    <p className="text-sm text-slate-500 py-4 text-center">Loading notifications...</p>
                ) : notifications.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No notifications yet.</p>
                ) : (
                    notifications.map((notif) => (
                        <button
                            key={notif.id}
                            type="button"
                            onClick={() => void handleNotificationClick(notif.id, notif.action_url, notif.read)}
                            className="w-full text-left bg-[#f8f6f0] rounded-[16px] p-4 flex items-start gap-3 hover:bg-[#f1eee6] transition-colors"
                        >
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${notif.read ? 'bg-[#d9d9d9]' : 'bg-[#c1f237]'}`} />
                            <div>
                                <p className="text-slate-800 text-[13px] leading-snug font-semibold">{notif.title}</p>
                                <p className="text-slate-600 text-[12px] leading-snug mt-1">{notif.body}</p>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};
