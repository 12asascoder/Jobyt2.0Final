'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaBell, FaMagnifyingGlass, FaXmark } from 'react-icons/fa6';

interface DashboardHeaderProps {
    searchQuery: string;
    onSearchChange: (q: string) => void;
    searchActive: boolean;
    onSearchToggle: (active: boolean) => void;
}

export function DashboardHeader({
    searchQuery,
    onSearchChange,
    searchActive,
    onSearchToggle,
}: DashboardHeaderProps) {
    const [bellActive, setBellActive] = useState(false);

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
                                {/* Bell stays in black area */}
                                <button
                                    onClick={() => setBellActive(!bellActive)}
                                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white/80 hover:text-white transition-colors ml-1"
                                >
                                    <FaBell className="text-lg" />
                                </button>
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
                            </div>
                        )}
                    </div>

                    {/* Mobile: just bell pill (search is on row 2) */}
                    <div className="sm:hidden flex items-center bg-[#1a1a1a] rounded-full h-11 px-1.5">
                        <button
                            onClick={() => setBellActive(!bellActive)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                bellActive
                                    ? 'bg-lime-400 text-black'
                                    : 'text-white/80'
                            }`}
                        >
                            <FaBell className="text-sm" />
                        </button>
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

            {/* ── Row 2: Mobile-only search bar (same black/lime style) ── */}
            <div className="sm:hidden px-4 pb-3">
                <div className={`flex items-center rounded-full h-12 px-1.5 gap-0 transition-colors ${
                    searchQuery ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a]'
                }`}>
                    {searchQuery ? (
                        /* Active: lime search inside black pill */
                        <div className="flex items-center flex-1 bg-lime-400 rounded-full h-full px-4 gap-2.5">
                            <FaMagnifyingGlass className="text-black/70 text-sm shrink-0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { onSearchChange(e.target.value); onSearchToggle(true); }}
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
                                placeholder="Search"
                                className="flex-1 bg-transparent text-white placeholder-white/40 text-sm font-medium outline-none min-w-0"
                            />
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
