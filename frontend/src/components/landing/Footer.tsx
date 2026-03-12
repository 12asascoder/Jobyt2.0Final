'use client';

import Link from 'next/link';
import { FaTwitter, FaLinkedinIn, FaInstagram, FaHeart } from 'react-icons/fa6';

const candidateLinks = [
    { label: 'Find Internships', href: '#' },
    { label: 'Find Jobs', href: '#' },
    { label: 'Resume Builder', href: '#' },
    { label: 'Career Advice', href: '#' },
];

const employerLinks = [
    { label: 'Post a Job', href: '#' },
    { label: 'Pricing', href: '#' },
    { label: 'Hire Talent', href: '#' },
    { label: 'Resources', href: '#' },
];

const companyLinks = [
    { label: 'About Us', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Privacy Policy', href: '#' },
];

const socials = [
    { icon: <FaTwitter />, href: '#' },
    { icon: <FaLinkedinIn />, href: '#' },
    { icon: <FaInstagram />, href: '#' },
];

function FooterLinkColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
    return (
        <div>
            <h4 className="font-extrabold text-white mb-6 text-lg tracking-wide">{title}</h4>
            <ul className="space-y-4 font-medium text-slate-400">
                {links.map((l) => (
                    <li key={l.label}>
                        <Link
                            href={l.href}
                            className="hover:text-white hover:translate-x-1 transition-all inline-block"
                        >
                            {l.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function Footer() {
    return (
        <footer className="w-full bg-[#0b1120] rounded-t-[3rem] mt-auto relative z-20 pt-20 pb-10">
            <div className="max-w-[1400px] mx-auto px-6 md:px-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16 border-b border-white/10 pb-16">
                    {/* Brand */}
                    <div className="col-span-1 lg:col-span-2">
                        <Link href="/" className="flex items-center cursor-pointer mb-6">
                            <div className="relative w-6 h-6 mr-2">
                                <div className="absolute inset-0 border-[5px] border-brand-primary rounded-full border-t-transparent -rotate-45" />
                            </div>
                            <span className="font-extrabold text-3xl tracking-tight text-white">
                                jobyt<span className="text-brand-primary">.</span>
                            </span>
                        </Link>
                        <p className="text-slate-400 max-w-sm mb-8 leading-relaxed font-medium">
                            The modern platform connecting ambitious individuals with forward-thinking companies
                            worldwide. Built for the modern workforce.
                        </p>
                        <div className="flex space-x-5">
                            {socials.map((s, i) => (
                                <a
                                    key={i}
                                    href={s.href}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-300 hover:bg-brand-primary hover:text-slate-900 transition-all"
                                >
                                    {s.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    <FooterLinkColumn title="For Candidates" links={candidateLinks} />
                    <FooterLinkColumn title="For Employers" links={employerLinks} />
                    <FooterLinkColumn title="Company" links={companyLinks} />
                </div>

                {/* Bottom */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-slate-500 font-medium text-sm">© 2026 Jobyt. All rights reserved.</p>
                    <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                        Crafted with <FaHeart className="text-brand-primary animate-pulse" /> for the future of India.
                    </div>
                </div>
            </div>
        </footer>
    );
}
