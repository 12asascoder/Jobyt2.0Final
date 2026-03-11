'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    FaMagnifyingGlass,
    FaLocationDot,
    FaArrowRight,
    FaDribbble,
    FaArrowTrendUp,
} from 'react-icons/fa6';

export function HeroSection() {
    const router = useRouter();
    const [keyword, setKeyword] = useState('');
    const [location, setLocation] = useState('');

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (keyword.trim()) params.set('keyword', keyword.trim());
        if (location.trim()) params.set('location', location.trim());
        router.push(`/jobs?${params.toString()}`);
    };

    return (
        <main className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden flex flex-col items-center min-h-screen justify-center">
            {/* Animated Background Blobs */}
            <div className="hero-bg opacity-50 md:opacity-100">
                <div className="absolute top-[-10%] left-[-10%] w-[80%] md:w-[50%] h-[60%] blob-1 animate-blob" />
                <div
                    className="absolute top-[20%] right-[-10%] w-[80%] md:w-[60%] h-[70%] blob-2 animate-blob hidden md:block"
                    style={{ animationDelay: '2s' }}
                />
                <div
                    className="absolute bottom-[-20%] left-[20%] w-[80%] md:w-[50%] h-[50%] blob-3 animate-blob"
                    style={{ animationDelay: '4s' }}
                />
            </div>

            {/* Decorative Sparkles */}
            <div className="absolute top-40 left-10 md:left-20 text-brand-primary text-2xl animate-pulse hidden sm:block">
                ✦
            </div>
            <div
                className="absolute top-60 right-20 text-brand-blue text-xl animate-pulse hidden lg:block"
                style={{ animationDelay: '1s' }}
            >
                ✳
            </div>

            <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 relative z-10 flex flex-col items-center">
                {/* Heading */}
                <div className="text-center max-w-4xl mx-auto reveal">
                    <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/60 border border-slate-200 text-slate-700 text-sm font-bold mb-6 shadow-sm backdrop-blur-sm">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                        </span>
                        Over 10,000+ active opportunities
                    </span>

                    <h1 className="text-[2.75rem] leading-[1.1] md:text-6xl lg:text-[5rem] font-extrabold text-slate-900 tracking-tight mb-6">
                        Launch your career <br className="hidden sm:block" />
                        with the{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-coral relative">
                            perfect role.
                            <svg
                                className="absolute w-full h-4 -bottom-2 left-0 text-brand-primary opacity-60"
                                viewBox="0 0 200 12"
                                fill="none"
                                preserveAspectRatio="none"
                            >
                                <path
                                    d="M2 10C50 2 150 2 198 10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </span>
                    </h1>
                    <p className="mt-4 text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
                        Discover internships and fresher jobs that match your passion. Top Indian and global
                        companies are looking for talent exactly like you.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="w-full max-w-4xl bg-white/90 backdrop-blur-md rounded-3xl md:rounded-full p-2 md:p-3 flex flex-col md:flex-row items-center shadow-[0_20px_50px_rgb(0,0,0,0.08)] border border-white mb-10 gap-2 md:gap-0 relative z-30 reveal reveal-delay-1 transition-all hover:shadow-[0_20px_50px_rgb(0,0,0,0.12)] hover:border-brand-primary/30">
                    <div className="flex-1 flex items-center px-4 md:px-6 py-3 border-b md:border-b-0 md:border-r border-slate-200 w-full">
                        <FaMagnifyingGlass className="text-slate-400 mr-3 text-lg" />
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Job title, keywords, or company"
                            className="w-full focus:outline-none text-slate-800 placeholder-slate-400 text-base md:text-lg font-medium bg-transparent"
                        />
                    </div>
                    <div className="flex items-center px-4 md:px-6 py-3 w-full md:w-[35%] border-b md:border-b-0 border-slate-200">
                        <FaLocationDot className="text-slate-400 mr-3 text-lg shrink-0" />
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="City, state, or remote"
                            className="w-full focus:outline-none text-slate-800 placeholder-slate-400 text-base md:text-lg font-medium bg-transparent"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="w-full md:w-auto md:ml-2 bg-slate-900 text-white rounded-2xl md:rounded-full px-8 py-4 font-bold text-lg hover:bg-brand-primary hover:text-slate-900 transition-colors shadow-md flex items-center justify-center gap-2 shrink-0 group mt-2 md:mt-0"
                    >
                        Search{' '}
                        <FaArrowRight className="-rotate-45 group-hover:rotate-0 transition-transform" />
                    </button>
                </div>

                {/* Trending Tags */}
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 text-sm font-semibold text-slate-500 mb-8 md:mb-16 reveal reveal-delay-2">
                    <span className="mr-2">Trending:</span>
                    <a
                        href="#"
                        className="px-4 py-2 rounded-full bg-white/60 border border-slate-200 hover:border-brand-primary hover:text-brand-primary hover:bg-white transition-all shadow-sm"
                    >
                        💻 Work from Home
                    </a>
                    <a
                        href="#"
                        className="px-4 py-2 rounded-full bg-white/60 border border-slate-200 hover:border-brand-primary hover:text-brand-primary hover:bg-white transition-all shadow-sm"
                    >
                        🎨 UI/UX Design
                    </a>
                    <a
                        href="#"
                        className="px-4 py-2 rounded-full bg-white/60 border border-slate-200 hover:border-brand-primary hover:text-brand-primary hover:bg-white transition-all shadow-sm"
                    >
                        📊 Data Science
                    </a>
                </div>

                {/* Hero Visuals Area */}
                <div className="relative w-full max-w-5xl mx-auto h-[350px] sm:h-[450px] lg:h-[550px] mt-4 reveal reveal-delay-3">
                    {/* Center Character */}
                    <div className="absolute inset-x-0 bottom-0 flex justify-center items-end z-10 h-full">
                        <Image
                            src="/3duser.png"
                            alt="3D Character"
                            width={400}
                            height={400}
                            className="h-[85%] sm:h-[95%] w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-700 ease-out"
                            unoptimized
                        />
                    </div>

                    {/* Mid-Left Floating Microsoft Logo */}
                    <div className="absolute top-[38%] left-[2%] md:left-[8%] w-10 h-10 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.08)] z-20 animate-float border-2 border-slate-50 hidden md:flex">
                        <Image
                            src="https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg"
                            alt="Microsoft"
                            width={24}
                            height={24}
                            unoptimized
                        />
                    </div>

                    {/* Dribbble Icon */}
                    <div className="absolute top-[10%] left-[25%] md:left-[30%] w-14 h-14 md:w-16 md:h-16 bg-[#fb4e73] rounded-2xl md:rounded-full flex items-center justify-center text-white text-2xl md:text-3xl shadow-[0_15px_30px_rgba(251,78,115,0.4)] z-20 animate-float border-2 border-white hidden md:flex">
                        <FaDribbble />
                    </div>

                    {/* Top Categories Chart */}
                    <div className="absolute bottom-[20%] left-0 md:left-[5%] glass-card p-4 md:p-5 rounded-3xl z-20 w-44 md:w-56 animate-float-delayed hidden md:block">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs md:text-sm font-bold text-slate-800">Top Categories</h4>
                            <FaArrowTrendUp className="text-green-500 text-base md:text-lg" />
                        </div>
                        <div className="flex items-end justify-between gap-1.5 h-12 md:h-16">
                            <div className="w-1/4 bg-gradient-to-t from-blue-200 to-brand-blue rounded-md h-[60%] shadow-sm" />
                            <div className="w-1/4 bg-gradient-to-t from-pink-200 to-pink-500 rounded-md h-[80%] shadow-sm" />
                            <div className="w-1/4 bg-gradient-to-t from-purple-200 to-purple-500 rounded-md h-[40%] shadow-sm" />
                            <div className="w-1/4 bg-gradient-to-t from-orange-200 to-brand-primary rounded-md h-[100%] shadow-sm relative">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                                    +24%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Interview Scheduled Badge (Left side) */}
                    <div className="absolute top-[28%] md:top-[25%] left-0 md:left-[5%] glass-card p-2.5 md:p-3 pr-4 md:pr-6 rounded-full z-20 flex flex-row items-center gap-2.5 md:gap-3 animate-float whitespace-nowrap hidden md:flex">
                        <div className="relative">
                            <Image
                                src="https://i.pravatar.cc/150?img=1"
                                alt="Applicant"
                                width={40}
                                height={40}
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white object-cover shadow-sm"
                                unoptimized
                            />
                            <div className="absolute -bottom-1 -right-1 bg-yellow-400 w-2.5 h-2.5 border-2 border-white rounded-full" />
                        </div>
                        <div className="text-left">
                            <p className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-wide uppercase mb-0.5">
                                Interview Scheduled
                            </p>
                            <p className="text-xs md:text-sm font-extrabold text-slate-900 leading-none">
                                Figma
                            </p>
                        </div>
                    </div>

                    {/* Hired Recently Badge 1 (Sourav) */}
                    <div className="absolute top-[30%] md:top-[25%] right-0 md:right-[8%] glass-card p-2 md:p-3 pr-4 md:pr-6 rounded-full z-20 flex flex-row items-center gap-2 md:gap-3 animate-float whitespace-nowrap hidden md:flex">
                        <div className="relative">
                            <Image
                                src="https://media.licdn.com/dms/image/v2/D5603AQHmXTkx3bJ0SA/profile-displayphoto-scale_400_400/B56ZwN7O8zIQAk-/0/1769760158482?e=1774483200&v=beta&t=qvFbTxXUT0mJvYNUM2YuQmdASe0FomTnc3qXO67lW4Q"
                                alt="Sourav"
                                width={40}
                                height={40}
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white object-cover shadow-md"
                                unoptimized
                            />
                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-2.5 h-2.5 border-2 border-white rounded-full" />
                        </div>
                        <div className="text-left">
                            <p className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-wide uppercase mb-0.5">
                                Hired Recently
                            </p>
                            <p className="text-xs md:text-sm font-extrabold text-slate-900 leading-none">
                                Sourav joined Google
                            </p>
                        </div>
                    </div>

                    {/* Hired Recently Badge 2 (Ayush) */}
                    <div className="absolute top-[48%] md:top-[45%] right-[-5%] md:right-[2%] glass-card p-2 md:p-3 pr-4 md:pr-6 rounded-full z-20 flex flex-row items-center gap-2 md:gap-3 animate-float-delayed whitespace-nowrap hidden md:flex">
                        <div className="relative">
                            <Image
                                src="https://media.licdn.com/dms/image/v2/D5603AQE-R4BTnUDv9w/profile-displayphoto-crop_800_800/B56ZkZBrR7IAAI-/0/1757061495078?e=1774483200&v=beta&t=F8KZTCgZ62Lr8Q-keJAVc3SbIXGVDPe0TK7r27md53E"
                                alt="Ayush"
                                width={40}
                                height={40}
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white object-cover shadow-md"
                                unoptimized
                            />
                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-2.5 h-2.5 border-2 border-white rounded-full" />
                        </div>
                        <div className="text-left">
                            <p className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-wide uppercase mb-0.5">
                                Hired Recently
                            </p>
                            <p className="text-xs md:text-sm font-extrabold text-slate-900 leading-none">
                                Ayush joined Amazon
                            </p>
                        </div>
                    </div>

                    {/* Amazon Icon (Right side, lower bottom - formerly Google) */}
                    <div className="absolute bottom-[20%] right-[8%] md:right-[15%] w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl md:rounded-full flex items-center justify-center shadow-[0_15px_30px_rgba(0,0,0,0.1)] z-20 animate-float-delayed border-2 border-slate-50 hidden md:flex">
                        <Image
                            src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg"
                            alt="Amazon"
                            width={32}
                            height={32}
                            className="w-8 h-8 object-contain object-center"
                            unoptimized
                        />
                    </div>

                    {/* Google Icon (Right side, top - formerly Amazon) */}
                    <div className="absolute top-[15%] right-[25%] md:right-[35%] w-10 h-10 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.06)] z-20 animate-float border-2 border-slate-50 hidden md:flex">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6 md:w-8 md:h-8">
                            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                        </svg>
                    </div>
                </div>
            </div>
        </main>
    );
}
