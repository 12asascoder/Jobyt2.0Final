'use client';

import {
    FaLocationDot,
    FaEarthAmericas,
    FaMoneyBillWave,
    FaClock,
    FaBriefcase,
    FaSackDollar,
    FaArrowRight,
} from 'react-icons/fa6';
import { FaRegClock } from 'react-icons/fa6';
import Image from 'next/image';

interface JobCardData {
    id: string;
    badge?: { text: string; color: string };
    companyLogo: string;
    title: string;
    company: string;
    locationIcon: React.ReactNode;
    location: string;
    stats: { icon: React.ReactNode; label: string; value: string; suffix?: string }[];
    timeAgo: string;
}

const jobs: JobCardData[] = [
    {
        id: '1',
        badge: { text: 'Actively Hiring', color: 'bg-green-100/80 text-green-700 border-green-200' },
        companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg',
        title: 'Cloud Solutions Architect',
        company: 'Microsoft',
        locationIcon: <FaLocationDot className="text-slate-400" />,
        location: 'Bangalore, India (Hybrid)',
        stats: [
            { icon: <FaSackDollar />, label: 'Salary', value: '₹24-30', suffix: ' LPA' },
            { icon: <FaBriefcase />, label: 'Type', value: 'Full-time' },
        ],
        timeAgo: '2 hours ago',
    },
    {
        id: '2',
        badge: { text: 'PPO Available', color: 'bg-blue-100/80 text-brand-blue border-blue-200' },
        companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
        title: 'Machine Learning Intern',
        company: 'Google',
        locationIcon: <FaEarthAmericas className="text-slate-400" />,
        location: 'Remote (India)',
        stats: [
            { icon: <FaMoneyBillWave />, label: 'Stipend', value: '₹60,000', suffix: '/mo' },
            { icon: <FaClock />, label: 'Duration', value: '6 Months' },
        ],
        timeAgo: '5 hours ago',
    },
    {
        id: '3',
        companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
        title: 'Data Analyst II',
        company: 'Amazon',
        locationIcon: <FaLocationDot className="text-slate-400" />,
        location: 'Hyderabad, India',
        stats: [
            { icon: <FaSackDollar />, label: 'Salary', value: '₹18-22', suffix: ' LPA' },
            { icon: <FaBriefcase />, label: 'Type', value: 'Full-time' },
        ],
        timeAgo: '1 day ago',
    },
    {
        id: '4',
        badge: { text: 'Urgent', color: 'bg-orange-100/80 text-brand-orange border-orange-200' },
        companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png',
        title: 'Product Analyst',
        company: 'Uber',
        locationIcon: <FaLocationDot className="text-slate-400" />,
        location: 'Gurugram, India (On-site)',
        stats: [
            { icon: <FaSackDollar />, label: 'Salary', value: '₹14-18', suffix: ' LPA' },
            { icon: <FaBriefcase />, label: 'Type', value: 'Full-time' },
        ],
        timeAgo: '1 day ago',
    },
    {
        id: '5',
        companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
        title: 'Frontend Engineer',
        company: 'Slack',
        locationIcon: <FaEarthAmericas className="text-slate-400" />,
        location: 'Remote (Global)',
        stats: [
            { icon: <FaSackDollar />, label: 'Salary', value: '$120k', suffix: '/yr' },
            { icon: <FaBriefcase />, label: 'Type', value: 'Full-time' },
        ],
        timeAgo: '2 days ago',
    },
    {
        id: '6',
        badge: { text: 'Internship', color: 'bg-purple-100/80 text-purple-700 border-purple-200' },
        companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Spotify_logo_with_text.svg',
        title: 'Product Design Intern',
        company: 'Spotify',
        locationIcon: <FaEarthAmericas className="text-slate-400" />,
        location: 'Remote (Europe/Asia)',
        stats: [
            { icon: <FaMoneyBillWave />, label: 'Stipend', value: '$2,000', suffix: '/mo' },
            { icon: <FaClock />, label: 'Duration', value: '3 Months' },
        ],
        timeAgo: '2 days ago',
    },
    {
        id: '7',
        companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_Bélo.svg',
        title: 'Senior Data Analyst',
        company: 'Airbnb',
        locationIcon: <FaLocationDot className="text-slate-400" />,
        location: 'Bangalore, India',
        stats: [
            { icon: <FaSackDollar />, label: 'Salary', value: '₹28-35', suffix: ' LPA' },
            { icon: <FaBriefcase />, label: 'Type', value: 'Full-time' },
        ],
        timeAgo: '3 days ago',
    },
    {
        id: '8',
        companyLogo: 'https://logowik.com/content/uploads/images/swiggy2340.jpg',
        title: 'Business Analyst',
        company: 'Swiggy',
        locationIcon: <FaLocationDot className="text-slate-400" />,
        location: 'Bangalore, India (Hybrid)',
        stats: [
            { icon: <FaSackDollar />, label: 'Salary', value: '₹12-16', suffix: ' LPA' },
            { icon: <FaBriefcase />, label: 'Type', value: 'Full-time' },
        ],
        timeAgo: '3 days ago',
    },
    {
        id: '9',
        badge: { text: 'Actively Hiring', color: 'bg-green-100/80 text-green-700 border-green-200' },
        companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
        title: 'Quantitative Analyst',
        company: 'Netflix',
        locationIcon: <FaEarthAmericas className="text-slate-400" />,
        location: 'Remote (US/India)',
        stats: [
            { icon: <FaSackDollar />, label: 'Salary', value: '$150k', suffix: '/yr' },
            { icon: <FaBriefcase />, label: 'Type', value: 'Full-time' },
        ],
        timeAgo: '4 days ago',
    },
    {
        id: '10',
        companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Discord_Logo_sans_texte.svg',
        title: 'Data Science Intern',
        company: 'Discord',
        locationIcon: <FaEarthAmericas className="text-slate-400" />,
        location: 'Remote',
        stats: [
            { icon: <FaMoneyBillWave />, label: 'Stipend', value: '$1,500', suffix: '/mo' },
            { icon: <FaClock />, label: 'Duration', value: '6 Months' },
        ],
        timeAgo: '4 days ago',
    },
    {
        id: '11',
        companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
        title: 'Financial Analyst',
        company: 'Google',
        locationIcon: <FaLocationDot className="text-slate-400" />,
        location: 'Hyderabad, India',
        stats: [
            { icon: <FaSackDollar />, label: 'Salary', value: '₹20-25', suffix: ' LPA' },
            { icon: <FaBriefcase />, label: 'Type', value: 'Full-time' },
        ],
        timeAgo: '5 days ago',
    },
    {
        id: '12',
        badge: { text: 'New Role', color: 'bg-blue-100/80 text-brand-blue border-blue-200' },
        companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
        title: 'Risk Analyst',
        company: 'Amazon',
        locationIcon: <FaLocationDot className="text-slate-400" />,
        location: 'Pune, India',
        stats: [
            { icon: <FaSackDollar />, label: 'Salary', value: '₹15-20', suffix: ' LPA' },
            { icon: <FaBriefcase />, label: 'Type', value: 'Full-time' },
        ],
        timeAgo: '5 days ago',
    },
];

export function JobCards() {
    return (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-20 bg-[#fcfcfc]">
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 reveal">
                <div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Recommended opportunities
                    </h2>
                    <p className="text-slate-500 mt-2 text-base md:text-lg">
                        Curated internships and jobs based on current market trends
                    </p>
                </div>
                <a
                    href="#"
                    className="hidden md:flex text-slate-900 font-bold hover:text-brand-orange transition-colors items-center gap-2 group mt-4 md:mt-0 shadow-sm border border-slate-200 px-5 py-2.5 rounded-xl bg-white hover:border-brand-orange"
                >
                    View all{' '}
                    <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                </a>
            </div>

            {/* Changed from 3 columns to 4 columns on large screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
                {jobs.map((job, i) => (
                    <div
                        key={job.id}
                        className={`job-card bg-white rounded-2xl p-5 md:p-6 border border-slate-100 relative group cursor-pointer flex flex-col h-full reveal reveal-delay-${(i % 4) + 1} ${i >= 6 ? 'hidden md:flex' : ''}`}
                    >
                        {job.badge && (
                            <div
                                className={`absolute top-5 right-5 text-[10px] font-bold px-2.5 py-1 rounded-full border tracking-wide uppercase ${job.badge.color}`}
                            >
                                {job.badge.text}
                            </div>
                        )}

                        <div className="flex flex-col gap-4 mb-5 mt-2">
                            {/* Real Company Logo instead of specific icons */}
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 bg-white p-2"
                            >
                                <Image
                                    src={job.companyLogo}
                                    alt={job.company}
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-contain"
                                    unoptimized
                                />
                            </div>
                            <div>
                                {/* Smaller font size for title */}
                                <h3 className="text-[17px] md:text-lg font-bold text-slate-900 leading-tight group-hover:text-brand-orange transition-colors line-clamp-2">
                                    {job.title}
                                </h3>
                                {/* Much smaller subtitle font */}
                                <p className="text-sm text-slate-500 font-medium mt-1">{job.company}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-5">
                            {job.locationIcon}
                            <span className="truncate">{job.location}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5 flex-grow">
                            {job.stats.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="bg-slate-50 group-hover:bg-orange-50/50 transition-colors p-3 rounded-xl border border-slate-100/60"
                                >
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-extrabold tracking-wider mb-1">
                                        {stat.icon} {stat.label}
                                    </div>
                                    <div className="font-bold text-slate-800 text-sm md:text-base">
                                        {stat.value}
                                        {stat.suffix && (
                                            <span className="text-xs text-slate-500 font-medium">{stat.suffix}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                <FaRegClock /> {job.timeAgo}
                            </span>
                            <button className="text-slate-900 font-bold group-hover:text-white bg-slate-100 group-hover:bg-slate-900 px-4 py-2 rounded-lg transition-all duration-300 text-sm">
                                Apply
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-10 text-center md:hidden">
                <button className="bg-white border-2 border-slate-200 text-slate-900 font-bold px-8 py-3 rounded-xl shadow-sm hover:border-brand-orange hover:text-brand-orange w-full transition-all text-sm">
                    View all opportunities
                </button>
            </div>
        </section>
    );
}
