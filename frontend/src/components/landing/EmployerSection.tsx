'use client';

import Image from 'next/image';
import {
    FaWandMagicSparkles,
    FaCalendarCheck,
    FaBolt,
    FaCheck,
} from 'react-icons/fa6';

export function EmployerSection() {
    return (
        <section className="bg-slate-900 text-white py-24 relative overflow-hidden">
            {/* Abstract Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-brand-primary/20 rounded-full blur-[120px]" />
                <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-brand-blue/20 rounded-full blur-[120px]" />
                <svg
                    className="absolute top-1/2 left-0 w-full opacity-20"
                    viewBox="0 0 1440 320"
                    preserveAspectRatio="none"
                >
                    <path
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeDasharray="10 10"
                        d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,149.3C672,149,768,203,864,229.3C960,256,1056,256,1152,240C1248,224,1344,192,1392,176L1440,160"
                    />
                </svg>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left Content */}
                    <div className="reveal">
                        <span className="text-brand-primary font-extrabold uppercase tracking-widest text-sm mb-4 block">
                            For Employers
                        </span>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-[1.1]">
                            Hire the top{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-yellow-400">
                                1% talent.
                            </span>
                        </h2>
                        <p className="text-slate-300 text-lg md:text-xl mb-10 leading-relaxed max-w-lg font-medium">
                            Jobyt gives you access to a curated pool of passionate students and professionals in
                            India and globally. Post a job in minutes.
                        </p>

                        <ul className="space-y-6 mb-10">
                            <li className="flex items-center gap-4 text-lg font-semibold text-white">
                                <div className="bg-white/10 p-3 rounded-xl border border-white/5">
                                    <FaWandMagicSparkles className="text-brand-primary" />
                                </div>
                                Smart AI Candidate Matching
                            </li>
                            <li className="flex items-center gap-4 text-lg font-semibold text-white">
                                <div className="bg-white/10 p-3 rounded-xl border border-white/5">
                                    <FaCalendarCheck className="text-green-400" />
                                </div>
                                Seamless Interview Scheduling
                            </li>
                            <li className="flex items-center gap-4 text-lg font-semibold text-white">
                                <div className="bg-white/10 p-3 rounded-xl border border-white/5">
                                    <FaBolt className="text-yellow-400" />
                                </div>
                                Zero Hidden Charges
                            </li>
                        </ul>

                        <button className="bg-brand-primary text-slate-900 px-8 py-4 rounded-2xl font-bold text-lg hover:brightness-95 transition-all shadow-[0_10px_25px_rgba(195,255,61,0.3)] hover:shadow-[0_15px_35px_rgba(195,255,61,0.4)] hover:-translate-y-1">
                            Post a Job for Free
                        </button>
                    </div>

                    {/* Right - Live Applicants Mockup */}
                    <div className="relative hidden lg:block reveal reveal-delay-2">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-8 relative shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-700 ease-out z-10">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full bg-brand-primary animate-pulse" />
                                    <div className="text-white font-bold text-lg tracking-wide">Live Applicants</div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-slate-600" />
                                    <div className="w-3 h-3 rounded-full bg-slate-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                </div>
                            </div>

                            {/* Applicant List */}
                            <div className="space-y-5">
                                <div className="flex gap-5 items-center bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                    <div className="shrink-0 relative">
                                        <Image
                                            src="https://i.pravatar.cc/150?img=5"
                                            alt="Priya Sharma"
                                            width={56}
                                            height={56}
                                            className="w-14 h-14 rounded-full border-2 border-brand-primary object-cover"
                                            unoptimized
                                        />
                                        <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 w-3.5 h-3.5 border-2 border-slate-900 rounded-full" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-white font-bold text-lg">Priya Sharma</div>
                                        <div className="text-slate-400 text-sm font-medium">UI/UX Designer • Bangalore</div>
                                    </div>
                                    <div className="bg-green-400/20 text-green-400 px-4 py-1.5 text-sm font-bold rounded-full border border-green-400/30">
                                        Match 98%
                                    </div>
                                </div>

                                <div className="flex gap-5 items-center bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                    <Image
                                        src="https://i.pravatar.cc/150?img=11"
                                        alt="Arjun Reddy"
                                        width={56}
                                        height={56}
                                        className="w-14 h-14 rounded-full border-2 border-slate-600"
                                        unoptimized
                                    />
                                    <div className="flex-1">
                                        <div className="text-white font-bold text-lg">Arjun Reddy</div>
                                        <div className="text-slate-400 text-sm font-medium">
                                            Full Stack Dev • Hyderabad
                                        </div>
                                    </div>
                                    <div className="bg-brand-blue/20 text-brand-blue px-4 py-1.5 text-sm font-bold rounded-full border border-brand-blue/30">
                                        Match 92%
                                    </div>
                                </div>

                                {/* Loading Skeleton */}
                                <div className="flex gap-5 items-center opacity-40 p-4">
                                    <div className="w-14 h-14 bg-white/20 rounded-full animate-pulse" />
                                    <div className="flex-1">
                                        <div className="w-1/2 h-4 bg-white/20 rounded-full mb-3 animate-pulse" />
                                        <div className="w-1/3 h-3 bg-white/10 rounded-full animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            {/* Floating Badge */}
                            <div className="absolute -right-8 -bottom-8 bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex items-center gap-4 animate-float-delayed z-20">
                                <div className="bg-green-100 p-3 rounded-2xl text-xl">
                                    <FaCheck className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-slate-900 font-extrabold text-base">Hired Successfully</p>
                                    <p className="text-slate-500 text-sm font-medium">Just now via Jobyt</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
