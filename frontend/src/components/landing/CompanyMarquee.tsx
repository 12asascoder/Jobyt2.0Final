'use client';

const companies = [
    { name: 'Amazon', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
    { name: 'Microsoft', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg' },
    { name: 'Google', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg' },
    { name: 'Swiggy', logo: 'https://logowik.com/content/uploads/images/swiggy2340.jpg' },
    { name: 'Uber', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png' },
    { name: 'Slack', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg' },
    { name: 'Spotify', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Spotify_logo_with_text.svg' },
    { name: 'Airbnb', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_Bélo.svg' },
];

function LogoItem({ name, logo }: { name: string; logo: string }) {
    // Make Swiggy logo specifically larger since it has more whitespace in the image
    const isSwiggy = name === 'Swiggy';

    return (
        <div className="flex-shrink-0 w-[140px] md:w-[160px] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={logo}
                alt={name}
                className={`w-auto object-contain ${isSwiggy ? 'h-10 md:h-14 max-w-[150px]' : 'h-7 md:h-9 max-w-[130px]'
                    }`}
            />
        </div>
    );
}

export function CompanyMarquee() {
    return (
        <section className="py-10 bg-white border-y border-slate-100 overflow-hidden reveal">
            <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">
                Trusted by 10,000+ top startups &amp; companies worldwide
            </p>
            <div className="relative w-full overflow-hidden group">
                {/* Single animated strip: two copies side-by-side for seamless loop */}
                <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
                    {/* First copy */}
                    <div className="flex items-center gap-14 md:gap-20 px-7 md:px-10">
                        {companies.map((c) => (
                            <LogoItem key={`a-${c.name}`} name={c.name} logo={c.logo} />
                        ))}
                    </div>
                    {/* Second copy (duplicate for seamless loop) */}
                    <div className="flex items-center gap-14 md:gap-20 px-7 md:px-10" aria-hidden="true">
                        {companies.map((c) => (
                            <LogoItem key={`b-${c.name}`} name={c.name} logo={c.logo} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
