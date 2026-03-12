'use client';

import Image from 'next/image';
import { FaStar, FaStarHalfStroke, FaQuoteLeft } from 'react-icons/fa6';

interface Testimonial {
    stars: number;
    halfStar?: boolean;
    text: string;
    avatar: string;
    name: string;
    role: string;
}

const testimonials: Testimonial[] = [
    {
        stars: 5,
        text: '"I landed my dream UI/UX role at a top startup in Bangalore within a week of using Jobyt. The UI is buttery smooth and the direct HR chat saved me!"',
        avatar: 'https://i.pravatar.cc/150?img=5',
        name: 'Ananya Gupta',
        role: 'Product Designer',
    },
    {
        stars: 5,
        text: '"The stipend transparency is what I loved most. Found an amazing remote frontend internship without dealing with any fake postings. Highly recommend!"',
        avatar: 'https://i.pravatar.cc/150?img=12',
        name: 'Rahul Verma',
        role: 'SDE Intern',
    },
    {
        stars: 4,
        halfStar: true,
        text: '"As a fresher, the candidate matching feature connected me with companies I didn\'t even know existed. Got my offer letter yesterday!"',
        avatar: 'https://i.pravatar.cc/150?img=41',
        name: 'Sneha Patil',
        role: 'Marketing Exec',
    },
    {
        stars: 5,
        text: '"The interface is so clean and analytics for my job applications are spot on. I got 3 interview calls in my very first week."',
        avatar: 'https://i.pravatar.cc/150?img=14',
        name: 'Vikram Singh',
        role: 'Data Analyst',
    },
    {
        stars: 5,
        text: '"Finally a platform that cuts out the noise. The exact matching algorithm meant I only talked to companies looking for my specific React skills."',
        avatar: 'https://i.pravatar.cc/150?img=32',
        name: 'Neha Roy',
        role: 'Frontend Dev',
    },
];

function StarRating({ count, halfStar }: { count: number; halfStar?: boolean }) {
    return (
        <div className="flex text-yellow-400 text-sm gap-1 mb-5">
            {Array.from({ length: count }).map((_, i) => (
                <FaStar key={i} />
            ))}
            {halfStar && <FaStarHalfStroke />}
        </div>
    );
}

export function Testimonials() {
    // Duplicate for seamless marquee effect
    const duplicatedTestimonials = [...testimonials, ...testimonials];

    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 mb-16">
                <div className="text-center max-w-2xl mx-auto reveal">
                    <span className="text-brand-primary font-extrabold uppercase tracking-widest text-sm mb-3 block">
                        User Stories
                    </span>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                        Loved by talents across India
                    </h2>
                </div>
            </div>

            {/* Desktop Marquee & Mobile Carousel */}
            <div className="relative w-full py-6">
                {/* 
                    Mobile: swipeable carousel
                    Desktop: infinite seamless marquee 
                */}
                <div
                    className="flex overflow-x-auto md:overflow-visible snap-x snap-mandatory hide-scrollbar"
                    style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {/* Continuous Marquee Track */}
                    <div className="flex w-max md:animate-marquee md:hover:[animation-play-state:paused] gap-6 md:gap-8 min-w-full">
                        {/* First Block */}
                        <div className="flex gap-6 px-4 md:px-0 md:pr-6 shrink-0">
                            {testimonials.map((t, i) => (
                                <div
                                    key={`t1-${t.name}-${i}`}
                                    className="bg-slate-50 border border-slate-100/60 rounded-3xl p-6 md:p-8 relative shrink-0 w-[300px] md:w-[400px] snap-center hover:bg-white hover:border-brand-primary/40 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group"
                                >
                                    <FaQuoteLeft className="text-3xl text-slate-200 absolute top-6 right-6 group-hover:text-brand-primary/20 transition-colors" />
                                    <StarRating count={t.stars} halfStar={t.halfStar} />
                                    <p className="text-slate-700 font-medium text-base md:text-lg leading-relaxed mb-6 md:mb-8 relative z-10 h-[100px] md:h-[120px] overflow-hidden line-clamp-4">
                                        {t.text}
                                    </p>
                                    <div className="flex items-center gap-4 border-t border-slate-100 pt-5">
                                        <Image
                                            src={t.avatar}
                                            alt={t.name}
                                            width={48}
                                            height={48}
                                            className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-sm object-cover"
                                            unoptimized
                                        />
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm md:text-base">{t.name}</h4>
                                            <p className="text-xs md:text-sm text-slate-500 font-medium">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Second Identical Block for Seamless Loop (Hidden on Mobile) */}
                        <div className="hidden md:flex gap-6 pr-6 shrink-0" aria-hidden="true">
                            {testimonials.map((t, i) => (
                                <div
                                    key={`t2-${t.name}-${i}`}
                                    className="bg-slate-50 border border-slate-100/60 rounded-3xl p-6 md:p-8 relative shrink-0 w-[300px] md:w-[400px] hover:bg-white hover:border-brand-primary/40 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group"
                                >
                                    <FaQuoteLeft className="text-3xl text-slate-200 absolute top-6 right-6 group-hover:text-brand-primary/20 transition-colors" />
                                    <StarRating count={t.stars} halfStar={t.halfStar} />
                                    <p className="text-slate-700 font-medium text-base md:text-lg leading-relaxed mb-6 md:mb-8 relative z-10 h-[100px] md:h-[120px] overflow-hidden line-clamp-4">
                                        {t.text}
                                    </p>
                                    <div className="flex items-center gap-4 border-t border-slate-100 pt-5">
                                        <Image
                                            src={t.avatar}
                                            alt={t.name}
                                            width={48}
                                            height={48}
                                            className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-sm object-cover"
                                            unoptimized
                                        />
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm md:text-base">{t.name}</h4>
                                            <p className="text-xs md:text-sm text-slate-500 font-medium">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile swipe hint */}
            <div className="mt-4 text-center md:hidden text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                <span>←</span> Swipe to read more <span>→</span>
            </div>
        </section>
    );
}

