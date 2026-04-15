'use client';

import { ModemAnimatedFooter, defaultJobytSocials } from '@/components/ui/modem-animated-footer';

const companyLinks = [];

const candidateLinks = [
    { label: 'Explore Internships', href: '/internships' },
    { label: 'Career Paths', href: '/roadmaps' },
    { label: 'Resume Builder', href: '/resume-builder' },
];

const employerLinks = [
    { label: 'Post a Job', href: '/employer-login' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Hire Talent', href: '/employer-login' },
];

const socials = [
    { icon: <FaLinkedinIn />, href: 'https://www.linkedin.com/company/jobyt-in/' },
    { icon: <FaInstagram />, href: 'https://www.instagram.com/jobyt.in/' },
];

export function Footer() {
    return (
        <footer className="bg-black py-10 sm:py-11 md:py-14 lg:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-5 md:px-8 lg:px-6">

                {/* 🔥 ROW 1 - ONLY LOGO */}
                <div className="mb-8 sm:mb-9 md:mb-12">
                    <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-none">
                        Jobyt
                    </h2>
                </div>

                {/* 🔥 ROW 2 - MAIN GRID */}
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-7 sm:gap-y-9 md:gap-x-8 md:gap-y-9 lg:grid-cols-4 lg:gap-12 items-start">

                    {/* LEFT COLUMN */}
                    <div>
                        <div className="text-lg sm:text-xl font-semibold text-white">
                            Powered by{' '}
                            <a
                                href="https://spazorlabs.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lime-400"
                            >
                                SpazorLabs
                            </a>
                        </div>

                        {companyLinks.length > 0 && (
                            <ul className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3 text-[13px] sm:text-sm text-slate-300">
                                {companyLinks.map((item) => (
                                    <li key={item.label}>
                                        <Link href={item.href} className="hover:text-white transition">
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* CANDIDATES */}
                    <div>
                        <h4 className="mb-3 sm:mb-4 text-lg sm:text-xl font-semibold text-white">
                            For Candidates
                        </h4>

                        <ul className="space-y-2.5 sm:space-y-3 text-[13px] sm:text-sm text-slate-300">
                            {candidateLinks.map((l) => (
                                <li key={l.label}>
                                    <Link href={l.href} className="hover:text-white transition">
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        {/* SOCIALS */}
                        <div className="mt-5 sm:mt-6 flex gap-3 sm:gap-4 text-white text-base sm:text-lg">
                            {socials.map((social, idx) => (
                                <a
                                    key={idx}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-lime-400 transition"
                                >
                                    {social.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* EMPLOYERS */}
                    <div>
                        <h4 className="mb-3 sm:mb-4 text-lg sm:text-xl font-semibold text-white">
                            For Employers
                        </h4>

                        <ul className="space-y-2.5 sm:space-y-3 text-[13px] sm:text-sm text-slate-300">
                            {employerLinks.map((l) => (
                                <li key={l.label}>
                                    <Link href={l.href} className="hover:text-white transition">
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* RIGHT IMAGE */}
                    <div className="order-last flex justify-center sm:justify-start md:justify-center lg:justify-end items-start mt-1 sm:mt-2 md:mt-4 lg:-mt-40">
                        <Image
                            src="/assets/FooterLogo.svg"
                            alt="Footer Logo"
                            width={300}
                            height={420}
                            className="h-auto w-20 sm:w-24 lg:w-50"
                            priority
                        />
                    </div>

                </div>
            </div>
        </footer>
    );
}