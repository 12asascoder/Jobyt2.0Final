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
                            {/* Profile Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors ml-1"
                                >
                                    <FaUser className="text-sm" />
                                </button>
                                {profileOpen && (
                                    <div className="absolute right-0 top-14 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        <Link href="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-lime-600 transition-colors">
                                            <FaUser className="text-slate-400" />Profile
                                        </Link>
                                        <hr className="border-slate-100 my-1" />
                                        <button onClick={() => setProfileOpen(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                                            <FaArrowRightFromBracket className="text-red-400" />Logout
                                        </button>
                                    </div>
                                )}
                            </div>
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
                                <div className="flex items-center gap-1 ml-1 pl-1">
                                    <button
                                        onClick={() => setBellActive(!bellActive)}
                                        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                            bellActive ? 'bg-lime-400 text-black' : 'text-white/80 hover:text-white'
                                        }`}
                                    >
                                        <FaBell className="text-lg" />
                                    </button>
                                    
                                    {/* Profile Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setProfileOpen(!profileOpen)}
                                            className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                                        >
                                            <FaUser className="text-sm" />
                                        </button>
                                        {profileOpen && (
                                            <div className="absolute right-0 top-14 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                <Link href="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-lime-600 transition-colors">
                                                    <FaUser className="text-slate-400" />Profile
                                                </Link>
                                                <hr className="border-slate-100 my-1" />
                                                <button onClick={() => setProfileOpen(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                                                    <FaArrowRightFromBracket className="text-red-400" />Logout
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* STATE: Default / Notification — solid black pill */
                            <div className="flex items-center bg-[#1a1a1a] rounded-full h-14 px-2 gap-1">
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
                                
                                {/* Profile Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setProfileOpen(!profileOpen)}
                                        className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors ml-1"
                                    >
                                        <FaUser className="text-sm" />
                                    </button>
                                    {profileOpen && (
                                        <div className="absolute right-0 top-14 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            <Link href="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-lime-600 transition-colors">
                                                <FaUser className="text-slate-400" />Profile
                                            </Link>
                                            <hr className="border-slate-100 my-1" />
                                            <button onClick={() => setProfileOpen(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                                                <FaArrowRightFromBracket className="text-red-400" />Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
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
                    <button
                        onClick={() => setBellActive(!bellActive)}
                        className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                            bellActive
                                ? 'bg-lime-400 text-black'
                                : 'text-white/80 hover:text-white'
                        }`}
                    >
                        <FaBell className="text-lg" />
                    </button>
                </div>
            </div>
            )}
        </header>
    );
}
