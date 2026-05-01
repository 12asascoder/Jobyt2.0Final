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
    const [isHovered, setIsHovered] = useState(false);

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
            <div 
                className={`hidden lg:flex fixed left-1 xl:left-2 top-1/2 -translate-y-1/2 z-40 flex-col gap-3 transition-all duration-300 ease-in-out ${isHovered ? 'w-48 items-stretch' : 'w-16 items-center'}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Main icon pill */}
                <div className="bg-[#1a1a1a] rounded-[24px] py-2.5 px-2.5 flex flex-col gap-1 shadow-xl">
                    {mainItems.map(({ icon: Icon, href, label }) => {
                        const active = isActive(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                title={isHovered ? undefined : label}
                                className={`h-11 rounded-full flex items-center transition-colors overflow-hidden ${
                                    isHovered ? 'px-4 justify-start' : 'w-11 justify-center'
                                } ${active
                                        ? 'bg-lime-400 text-black'
                                        : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <Icon className="text-base shrink-0" />
                                <span 
                                    className={`text-[13px] font-semibold tracking-wide whitespace-nowrap transition-all duration-300 ${
                                        isHovered ? 'ml-3 w-auto opacity-100' : 'w-0 opacity-0 ml-0'
                                    }`}
                                >
                                    {label}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Bottom utility pill: star + logout + avatar */}
                <div className="bg-[#1a1a1a] rounded-[24px] py-3 px-2.5 flex flex-col gap-1 shadow-xl">
                    <Link
                        href={ROUTES.credits}
                        title={isHovered ? undefined : 'Credits'}
                        className={`h-11 rounded-full flex items-center transition-colors overflow-hidden ${
                            isHovered ? 'px-4 justify-start' : 'w-11 justify-center'
                        } ${isActive(ROUTES.credits)
                                ? 'bg-lime-400 text-black'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        <FaStar className="text-base shrink-0" />
                        <span 
                            className={`text-[13px] font-semibold tracking-wide whitespace-nowrap transition-all duration-300 ${
                                isHovered ? 'ml-3 w-auto opacity-100' : 'w-0 opacity-0 ml-0'
                            }`}
                        >
                            Credits
                        </span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        title={isHovered ? undefined : 'Sign out'}
                        className={`h-11 rounded-full text-white/60 hover:text-red-400 flex items-center transition-colors overflow-hidden ${
                            isHovered ? 'px-4 justify-start hover:bg-white/5' : 'w-11 justify-center'
                        }`}
                    >
                        <FaArrowRightFromBracket className="text-base shrink-0" />
                        <span 
                            className={`text-[13px] font-semibold tracking-wide whitespace-nowrap transition-all duration-300 ${
                                isHovered ? 'ml-3 w-auto opacity-100' : 'w-0 opacity-0 ml-0'
                            }`}
                        >
                            Sign Out
                        </span>
                    </button>
                    <Link
                        href={ROUTES.profile}
                        title={isHovered ? undefined : 'Profile'}
                        className={`h-11 rounded-full border-2 transition-colors flex items-center overflow-hidden ${
                            isHovered ? 'pl-0.5 pr-4 justify-start border-transparent hover:bg-white/10' : 'w-11 justify-center'
                        } ${isActive(ROUTES.profile) ? 'border-[#c3ff3d]' : 'border-white/20 hover:border-white/40'}`}
                    >
                        <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-slate-700 text-white text-xs font-semibold">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                avatarInitial
                            )}
                        </div>
                        <span 
                            className={`text-[13px] font-semibold tracking-wide whitespace-nowrap text-white/90 transition-all duration-300 ${
                                isHovered ? 'ml-3 w-auto opacity-100' : 'w-0 opacity-0 ml-0'
                            }`}
                        >
                            Profile
                        </span>
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
                    <div className="bg-black border border-[#222] rounded-2xl w-full max-w-sm p-8 text-center shadow-2xl font-brand">
                        <h3 className="text-2xl font-bold text-white mb-3 tracking-wide">Log Out?</h3>
                        <p className="text-white/60 text-sm mb-8 leading-relaxed">
                            Your progress is saved. Come back anytime to track your internship applications and update your profile.
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
