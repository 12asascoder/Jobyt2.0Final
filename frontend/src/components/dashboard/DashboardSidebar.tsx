'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { ROUTES } from '@/constants';
import {
    FaHouse,
    FaFileLines,
    FaBookmark,
    FaComments,
    FaUsers,
    FaStar,
    FaArrowRightFromBracket,
} from 'react-icons/fa6';
import { IconType } from 'react-icons';

interface SidebarItem {
    icon: IconType;
    href: string;
    label: string;
}

const mainItems: SidebarItem[] = [
    { icon: FaHouse, href: ROUTES.dashboard, label: 'Home' },
    { icon: FaFileLines, href: ROUTES.applications, label: 'Applications' },
    { icon: FaBookmark, href: ROUTES.savedJobs, label: 'Saved Jobs' },
    { icon: FaComments, href: ROUTES.messages, label: 'Messages' },
    { icon: FaUsers, href: ROUTES.community, label: 'Community' },
];

export function DashboardSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, user } = useAuthStore();
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const avatarInitial = useMemo(() => {
        const email = user?.email || '';
        return email.trim().charAt(0).toUpperCase() || 'U';
    }, [user?.email]);

    useEffect(() => {
        let mounted = true;

        const loadProfileAvatar = async () => {
            try {
                const res = await api.get<any>('/users/me');
                const profile = res.data?.profile;
                const raw = profile?.photo_url || profile?.logo_url || null;
                if (mounted) {
                    setAvatarUrl(resolveAssetUrl(raw));
                }
            } catch {
                if (mounted) {
                    setAvatarUrl(null);
                }
            }
        };

        void loadProfileAvatar();

        return () => {
            mounted = false;
        };
    }, [pathname, user?.role]);

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        logout();
        router.push('/');
    };

    return (
        <>
            {/* ── DESKTOP: Floating vertical bar ── */}
            <div className="hidden lg:flex fixed left-1 xl:left-2 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-3">
                {/* Main icon pill */}
                <div className="bg-[#1a1a1a] rounded-full py-2.5 px-2.5 flex flex-col items-center gap-1">
                    {mainItems.map(({ icon: Icon, href, label }) => {
                        const active = isActive(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                title={label}
                                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${active
                                        ? 'bg-lime-400 text-black'
                                        : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <Icon className="text-base" />
                            </Link>
                        );
                    })}
                </div>

                {/* Bottom utility pill: star + logout + avatar */}
                <div className="bg-[#1a1a1a] rounded-full py-3 px-2 flex flex-col items-center gap-0.5 mt-5">
                    <Link
                        href={ROUTES.credits}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${isActive(ROUTES.credits)
                                ? 'bg-lime-400 text-black'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                        title="Credits"
                    >
                        <FaStar className="text-base" />
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-11 h-11 rounded-full text-white/60 hover:text-red-400 flex items-center justify-center transition-colors"
                        title="Sign out"
                    >
                        <FaArrowRightFromBracket className="text-base" />
                    </button>
                    <Link
                        href={ROUTES.profile}
                        className={`w-11 h-11 rounded-full overflow-hidden border-2 transition-colors ${isActive(ROUTES.profile) ? 'border-[#c3ff3d]' : 'border-white/20 hover:border-white/40'
                            }`}
                        title="Profile"
                    >
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-slate-700 text-white flex items-center justify-center text-xs font-semibold">
                                {avatarInitial}
                            </div>
                        )}
                    </Link>
                </div>
            </div>

            {/* ── MOBILE / TABLET: Bottom dock ── */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a] safe-area-bottom">
                <div className="flex items-center justify-around px-3 h-[68px]">
                    {mainItems.map(({ icon: Icon, href, label }) => {
                        const active = isActive(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                title={label}
                                className="flex flex-col items-center gap-1 py-1"
                            >
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${active
                                            ? 'bg-lime-400 text-black'
                                            : 'text-white/50 hover:text-white'
                                        }`}
                                >
                                    <Icon className="text-[17px]" />
                                </div>
                                <span className={`text-[9px] font-semibold leading-none ${active ? 'text-lime-400' : 'text-white/40'}`}>
                                    {label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div 
                        className="bg-black rounded-3xl flex flex-col justify-center items-center text-center p-8"
                        style={{ width: '479px', height: '293px', boxShadow: '0px 0px 50px 0px #00000040' }}
                    >
                        <h3 className="text-[32px] font-bold text-white mb-4" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>Log Out?</h3>
                        <p className="text-white text-[14px] leading-tight max-w-[360px] mb-8" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
                            Your progress is saved. Come back anytime to track your internship applications.
                        </p>
                        <div className="flex items-center justify-center gap-12 w-full px-8">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="w-[120px] py-2.5 rounded-[12px] border-[0.8px] border-white/40 text-white text-[16px] hover:bg-white/10 transition-colors"
                                style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="w-[120px] py-2.5 rounded-[12px] bg-[#C3FF3D] text-black text-[16px] font-semibold hover:bg-[#aee62d] transition-colors"
                                style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
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
