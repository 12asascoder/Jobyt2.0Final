'use client';

export function Resume() {
    return (
        <section className="bg-white py-16 md:py-20 lg:py-24 relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
                
                {/* Headers */}
                <div className="text-center mb-10 md:mb-14 lg:mb-16">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-700 mb-2 md:mb-3 tracking-tight">
                        Got no Resume?
                    </h3>
                    <h2 className="font-display text-3xl font-extrabold text-slate-900 sm:text-4xl md:text-[2.6rem] lg:text-5xl tracking-tight">
                        We've got you covered!
                    </h2>
                </div>

                {/* 2-Column Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 md:gap-16 items-center">
                    
                    {/* Left Column: JobCard Placeholder SVG */}
                    <div className="w-full max-w-[420px] mx-auto lg:ml-auto">
                        <svg 
                            viewBox="0 0 303 266" 
                            width="100%" 
                            height="auto" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            className="drop-shadow-sm transition-transform duration-500 hover:scale-[1.02]"
                        >
                            <defs>
                                <pattern id="checker_resume" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                                    <rect fill="#F5F5F5" x="0" width="15" height="15" y="0"/>
                                    <rect fill="#EBEBEB" x="15" width="15" height="15" y="0"/>
                                    <rect fill="#EBEBEB" x="0" width="15" height="15" y="15"/>
                                    <rect fill="#F5F5F5" x="15" width="15" height="15" y="15"/>
                                </pattern>
                                {/* 
                                   USER: When you are ready to insert your image into this cutout frame, 
                                   you can change the 'fill' below to a new pattern containing your image:
                                   <pattern id="user_image" width="100%" height="100%" patternUnits="objectBoundingBox">
                                       <image href="/your-image-url.jpg" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" />
                                   </pattern>
                                   Then update the path's fill below to: fill="url(#user_image)"
                                */}
                            </defs>
                            <path 
                                d="M205.108 0C215.406 0 223.754 8.34817 223.754 18.6462V60.5999C223.754 70.8979 232.102 79.2461 242.4 79.2461H284.354C294.652 79.2461 303 87.5943 303 97.8923V247.062C303 257.36 294.652 265.708 284.354 265.708H18.6462C8.34817 265.708 0 257.36 0 247.062V18.6462C0 8.34817 8.34817 0 18.6462 0H205.108Z" 
                                fill="url(#checker_resume)" 
                            />
                        </svg>
                    </div>

                    {/* Right Column: Text and List - Force Left Align on Mobile */}
                    <div className="flex flex-col items-start mx-auto lg:mx-0 text-left w-full pl-2 sm:pl-4 lg:pl-8">
                        
                        <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed mb-8 max-w-[400px]">
                            Let us help you create one or improve the one you've got.
                        </p>

                        <ul className="flex flex-col gap-5 text-base sm:text-lg text-slate-800 font-semibold w-full mb-10 pl-0">
                            <li>AI Powered Resume Builder</li>
                            <li>Intelligent Feedback Engine</li>
                            <li>Optimized for Freshers</li>
                        </ul>

                        <button className="bg-[#A4CE3A] text-[#0b0b0b] rounded-full px-8 py-3.5 sm:px-9 text-sm sm:text-[15px] font-bold tracking-wide hover:bg-[#96C033] hover:shadow-lg transition-all active:scale-95">
                            Build My Resume
                        </button>
                    </div>

                </div>
            </div>
        </section>
    );
}
