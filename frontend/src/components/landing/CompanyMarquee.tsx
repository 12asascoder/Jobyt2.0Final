'use client';



import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const LOGO_HEIGHT = 28;
const GAP         = 80;   // paddingRight on every item — equal gap even at copy seam
const SPEED       = 90;   // px/s
const SMOOTH_TAU  = 0.3;
const MAX_DT      = 0.05;

const companies = [
    { name: 'Amazon',    src: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
    { name: 'Microsoft', src: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg' },
    { name: 'Google',    src: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg' },
    { name: 'Swiggy',    src: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/27/Swiggy_logo_%28old%29.svg/960px-Swiggy_logo_%28old%29.svg.png' },
    { name: 'Uber',      src: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png' },
    { name: 'Slack',     src: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg' },
    { name: 'Spotify',   src: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Spotify_logo_with_text.svg' },
    { name: 'Airbnb',    src: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg' },
];

export function CompanyMarquee() {
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef     = useRef<HTMLDivElement>(null);
    const seqRef       = useRef<HTMLUListElement>(null);

    const seqWidthRef  = useRef(0);
    const offsetRef    = useRef(0);
    const velocityRef  = useRef(0);
    const lastTsRef    = useRef<number | null>(null);
    const pausedRef    = useRef(false);
    const rafRef       = useRef<number | null>(null);
    const copyCountRef = useRef(2);

    const [copyCount, setCopyCount] = useState(2);
    const [ready, setReady]         = useState(false);

    // Single rAF loop — never restarts
    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        const step = (ts: number) => {
            if (lastTsRef.current === null) lastTsRef.current = ts;
            const dt = Math.min((ts - lastTsRef.current) / 1000, MAX_DT);
            lastTsRef.current = ts;
            const seqW = seqWidthRef.current;
            if (seqW > 0) {
                const target = pausedRef.current ? 0 : SPEED;
                velocityRef.current += (target - velocityRef.current) * (1 - Math.exp(-dt / SMOOTH_TAU));
                const next = ((offsetRef.current + velocityRef.current * dt) % seqW + seqW) % seqW;
                offsetRef.current = next;
                track.style.transform = `translate3d(${-next}px,0,0)`;
            }
            rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, []);

    const measure = useCallback(() => {
        const sw = seqRef.current?.getBoundingClientRect().width ?? 0;
        const cw = containerRef.current?.clientWidth ?? 0;
        if (sw <= 0 || cw <= 0) return;
        seqWidthRef.current = sw;
        const needed = Math.max(2, Math.ceil(cw / sw) + 2);
        if (needed !== copyCountRef.current) {
            copyCountRef.current = needed;
            setCopyCount(needed);
        }
        setReady(true);
    }, []);

    useEffect(() => {
        const seq = seqRef.current;
        if (!seq) return;
        const imgs = Array.from(seq.querySelectorAll('img')) as HTMLImageElement[];
        const pending = imgs.filter(img => !img.complete);
        if (pending.length === 0) { measure(); return; }
        let remaining = pending.length;
        const onLoad = () => { if (--remaining === 0) measure(); };
        pending.forEach(img => {
            img.addEventListener('load',  onLoad, { once: true });
            img.addEventListener('error', onLoad, { once: true });
        });
        return () => pending.forEach(img => {
            img.removeEventListener('load',  onLoad);
            img.removeEventListener('error', onLoad);
        });
    }, [measure]);

    useEffect(() => {
        if (!window.ResizeObserver) {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }
        const ro = new ResizeObserver(measure);
        if (containerRef.current) ro.observe(containerRef.current);
        if (seqRef.current)       ro.observe(seqRef.current);
        return () => ro.disconnect();
    }, [measure]);

    const lists = useMemo(() =>
        Array.from({ length: copyCount }, (_, ci) => (
            <ul key={ci} ref={ci === 0 ? seqRef : undefined}
                aria-hidden={ci > 0} role="list"
                style={{ display: 'flex', flexShrink: 0, alignItems: 'center', listStyle: 'none', margin: 0, padding: 0 }}
            >
                {companies.map(c => (
                    <li key={c.name} style={{ paddingRight: GAP, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        <img src={c.src} alt={c.name} draggable={false}
                            loading={ci === 0 ? 'eager' : 'lazy'} decoding="async"
                            style={{ height: LOGO_HEIGHT, width: 'auto', objectFit: 'contain', display: 'block', userSelect: 'none', pointerEvents: 'none', minWidth: 20 }}
                        />
                    </li>
                ))}
            </ul>
        )),
    [copyCount]);

    return (
        <div style={{ width: '100%' }}>
            <div ref={containerRef} role="region" aria-label="Partner logos"
                style={{ position: 'relative', width: '100%', overflow: 'hidden', opacity: ready ? 1 : 0, transition: 'opacity 0.4s ease' }}
            >
                {/* Fade edges — matches hero gradient so it bleeds naturally */}
                <div aria-hidden style={{ position: 'absolute', inset: '0 auto 0 0', width: 100, background: 'linear-gradient(to right, #f7f7f7, transparent)', zIndex: 10, pointerEvents: 'none' }} />
                <div aria-hidden style={{ position: 'absolute', inset: '0 0 0 auto', width: 100, background: 'linear-gradient(to left, #eef7d8, transparent)', zIndex: 10, pointerEvents: 'none' }} />

                <div ref={trackRef} style={{ display: 'flex', width: 'max-content', willChange: 'transform', userSelect: 'none' }}
                    onMouseEnter={() => { pausedRef.current = true; }}
                    onMouseLeave={() => { pausedRef.current = false; }}
                >
                    {lists}
                </div>
            </div>
        </div>
    );
}

export default CompanyMarquee;