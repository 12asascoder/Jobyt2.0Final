'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { FaBell, FaMagnifyingGlass, FaXmark, FaUser, FaArrowRightFromBracket } from 'react-icons/fa6';

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
    const [bellActive, setBellActive] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const pathname = usePathname();
    const hideSearch = pathname === '/profile' || pathname === '/referral';

    return (
        <header className="sticky top-0 z-50 w-full">
            {/* ── Row 1: Logo + pill + Roadmap ── */}
            <div className="mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-10 h-16 md:h-20">
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
                    <Image src="/logo.png" alt="Jobyt" width={28} height={28} className="object-contain" />
                    <span className="font-display text-xl font-bold text-slate-900 tracking-tight">Jobyt</span>
                </Link>

                {/* Right Actions */}
                <div className="flex items-center gap-3">

                    {/* ── Desktop/Tablet: Black outer pill with 3 states ── */}
                    {hideSearch ? (
                        <div className="hidden sm:flex items-center bg-[#1a1a1a] rounded-full h-14 px-2 gap-1 min-w-[100px] justify-end relative">
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
                    ) : (
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
                            /* STATE: Default / Notification — solid black pill */
                            <div className="flex items-center bg-[#1a1a1a] rounded-full h-14 px-2 gap-1 relative">
                                <button
                                    onClick={() => onSearchToggle(true)}
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
                    )}

                    {/* Mobile: Profile Dropdown (Replaces Bell) */}
                    <div className="sm:hidden relative">
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="w-11 h-11 bg-[#1a1a1a] rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
                        >
                            <FaUser className="text-sm" />
                        </button>

                        {/* Dropdown Menu */}
                        {profileOpen && (
                            <div className="absolute right-0 top-14 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                <Link 
                                    href="/profile" 
                                    onClick={() => setProfileOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-lime-600 transition-colors"
                                >
                                    <FaUser className="text-slate-400" />
                                    Profile
                                </Link>
                                <hr className="border-slate-100 my-1" />
                                <button
                                    onClick={() => {
                                        // add logout logic here later if needed
                                        setProfileOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <FaArrowRightFromBracket className="text-red-400" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Roadmap Pill */}
                    <Link
                        href="#"
                        className="hidden sm:flex items-center bg-[#1a1a1a] text-white rounded-full px-6 h-14 text-sm font-semibold hover:bg-black transition-colors"
                    >
                        Roadmap
                    </Link>
                </div>
            </div>

            {/* ── Row 2: Mobile-only search bar + bell ── */}
            {!hideSearch && (
                <div className="sm:hidden px-4 pb-3">
                    <div className="flex items-center rounded-full h-14 p-1.5 bg-[#1a1a1a] transition-colors gap-1">
                    {searchQuery ? (
                        /* Active: lime search inside black pill */
                        <div className="flex items-center flex-1 bg-lime-400 rounded-full h-full px-4 gap-2.5">
                            <FaMagnifyingGlass className="text-black/70 text-sm shrink-0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { onSearchChange(e.target.value); onSearchToggle(true); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim() && onSearchSubmit) onSearchSubmit(searchQuery.trim()); }}
                                placeholder="Search"
                                className="flex-1 bg-transparent text-black placeholder-black/40 text-sm font-semibold outline-none min-w-0"
                            />
                            <button
                                onClick={() => { onSearchChange(''); onSearchToggle(false); }}
                                className="text-black/50 hover:text-black transition-colors"
                            >
                                <FaXmark className="text-sm" />
                            </button>
                        </div>
                    ) : (
                        /* Default: white icons inside black pill */
                        <div className="flex items-center flex-1 px-3 gap-2.5">
                            <FaMagnifyingGlass className="text-white/60 text-sm shrink-0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { onSearchChange(e.target.value); onSearchToggle(true); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim() && onSearchSubmit) onSearchSubmit(searchQuery.trim()); }}
                                placeholder="Search"
                                className="flex-1 bg-transparent text-white placeholder-white/40 text-sm font-medium outline-none min-w-0"
                            />
                        </div>
                    )}

                    {/* Bell Icon inside the search pill */}
                    <div className="relative flex shrink-0">
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
                </div>
            </div>
            )}
        </header>
    );
}

const NotificationPopover = () => {
    const [activeTab, setActiveTab] = useState('Today');
    const tabs = ['Today', 'This Week', 'Earlier'];
    const notifications = [
        { id: 1, text: "You've been invited to an interview with Paysphere. Check your email for details.", read: false },
        { id: 2, text: "Don't miss out! 3 internships you saved are closing soon.", read: false },
        { id: 3, text: "You have a new message from a recruiter.", read: true },
        { id: 4, text: "You've applied to 10 internships. Keep going!", read: true },
        { id: 5, text: "We regret to inform you that your application was not selected this time.", read: true },
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
};
