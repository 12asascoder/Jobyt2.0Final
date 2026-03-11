'use client';

import { FaCircleCheck } from 'react-icons/fa6';

export function PricingSection() {
    return (
        <section className="relative py-24 bg-[#f8f9fc] overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[50%] bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[50%] bg-brand-blue/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16 reveal">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">
                        Simple, transparent <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-coral">pricing</span>
                    </h2>
                    <p className="text-lg text-slate-600 font-medium">
                        Choose the perfect plan for your hiring needs. No hidden fees.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                    {/* Free Plan */}
                    <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-white hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-2 transition-all duration-300 reveal reveal-delay-1 bg-white/60">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Basic</h3>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-4xl font-extrabold text-slate-900">₹0</span>
                                <span className="text-slate-500 font-semibold">/month</span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium">Perfect for individuals starting their career journey.</p>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-slate-700 font-medium">Create basic profile</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-slate-700 font-medium">Apply to up to 10 jobs/month</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-slate-700 font-medium">Basic email support</span>
                            </li>
                            <li className="flex items-start gap-3 opacity-50">
                                <FaCircleCheck className="text-slate-300 text-xl shrink-0 mt-0.5" />
                                <span className="text-slate-500 font-medium">Direct recruiter messaging</span>
                            </li>
                        </ul>
                        <button className="w-full py-4 rounded-full font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200">
                            Get Started
                        </button>
                    </div>

                    {/* Pro Plan (Middle Card) */}
                    <div className="glass-card rounded-[2rem] p-8 md:p-10 border-2 border-brand-primary relative bg-white md:scale-105 shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-all duration-300 z-10 reveal reveal-delay-2">
                        {/* Ribbon Badge */}
                        <div className="absolute top-0 right-10 -translate-y-1/2 bg-gradient-to-r from-brand-primary to-green-500 text-slate-900 text-xs font-black uppercase tracking-wider py-1.5 px-4 rounded-full shadow-lg border-2 border-white">
                            Most Popular
                        </div>

                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-brand-primary mb-2">Pro</h3>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-4xl font-extrabold text-slate-900">₹999</span>
                                <span className="text-slate-500 font-semibold">/month</span>
                            </div>
                            <p className="text-sm text-slate-600 font-medium">Accelerate your job search with premium features.</p>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-slate-800 font-medium">Highlighted applicant profile</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-slate-800 font-medium">Unlimited job applications</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-slate-800 font-medium">Direct recruiter messaging</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-slate-800 font-medium">Priority 24/7 support</span>
                            </li>
                        </ul>
                        <button className="w-full py-4 rounded-full font-bold text-slate-900 bg-brand-primary hover:bg-green-500 transition-colors shadow-lg shadow-brand-primary/30">
                            Upgrade to Pro
                        </button>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-white hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-2 transition-all duration-300 reveal reveal-delay-3 bg-white/60">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise</h3>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-4xl font-extrabold text-slate-900">₹4999</span>
                                <span className="text-slate-500 font-semibold">/month</span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium">For recruiters and hiring teams scaling up.</p>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-slate-700 font-medium">Post unlimited jobs</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-slate-700 font-medium">Advanced ATS integration</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-slate-700 font-medium">AI-powered candidate matching</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <FaCircleCheck className="text-brand-primary text-xl shrink-0 mt-0.5" />
                                <span className="text-slate-700 font-medium">Dedicated account manager</span>
                            </li>
                        </ul>
                        <button className="w-full py-4 rounded-full font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md">
                            Contact Sales
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
