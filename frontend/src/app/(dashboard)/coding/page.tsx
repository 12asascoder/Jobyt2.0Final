'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { PracticeSession } from '@/types/coding';
import { ArrowRight, Code2, History } from 'lucide-react';

export default function CodingHubPage() {
  const [progress, setProgress] = useState<{ solved: number; totalAttempts: number } | null>(null);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [progRes, sessRes] = await Promise.all([
          CodingApi.getPracticeProgress(),
          CodingApi.listPracticeSessions(),
        ]);
        setProgress(progRes.data ?? null);
        setSessions(sessRes.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <Spinner />
      </div>
    );
  }

  const accuracy = progress && progress.totalAttempts > 0 
    ? Math.round((progress.solved / progress.totalAttempts) * 100) 
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-16 font-sans">
      
      {/* Hero Section */}
      <div className="mb-10 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#0b1120] tracking-tight mb-3 font-display">
            Coding Arena
          </h1>
          <p className="text-slate-500 max-w-lg">
            Practice problems, run your code in the browser, and track your proficiency with real-time metrics.
          </p>
        </div>

        {/* Stats Boxes */}
        {progress && (
          <div className="flex flex-wrap gap-4">
            <div className="bg-[#141414] rounded-xl px-5 py-3 flex items-center gap-4 min-w-[160px] shadow-sm">
              <span className="text-4xl font-bold text-[#c3ff3d] leading-none">
                {progress.solved}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-snug">
                Problems<br />Solved
              </span>
            </div>
            <div className="bg-[#141414] rounded-xl px-5 py-3 flex items-center gap-4 min-w-[160px] shadow-sm">
              <span className="text-4xl font-bold text-[#c3ff3d] leading-none">
                {accuracy}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-snug">
                Accuracy<br />Rate (%)
              </span>
            </div>
            <div className="bg-[#141414] rounded-xl px-5 py-3 flex items-center gap-4 min-w-[160px] shadow-sm">
              <span className="text-4xl font-bold text-[#c3ff3d] leading-none">
                {progress.totalAttempts}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-snug">
                Total<br />Attempts
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Primary Actions Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        
        {/* Practice Block */}
        <div className="glass-card rounded-2xl p-8 flex flex-col justify-between border border-slate-200/60 bg-white/70">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#0b1120] text-[#c3ff3d] flex items-center justify-center mb-6">
              <Code2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-[#0b1120] mb-3">Algorithm Library</h2>
            <p className="text-slate-600 leading-relaxed mb-8 text-sm">
              Access the curated dataset of coding challenges. Execute in the browser. No configuration required.
            </p>
          </div>
          <Link href={ROUTES.codingPractice} className="inline-flex items-center w-fit text-[#0b1120] font-semibold hover:text-blue-600 transition-colors">
            Begin Session
            <ArrowRight className="w-4 h-4 ml-2" strokeWidth={2} />
          </Link>
        </div>

        {/* Submissions Block */}
        <div className="glass-card rounded-2xl p-8 flex flex-col justify-between border border-slate-200/60 bg-white/70">
          <div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0b1120] flex items-center justify-center mb-6">
              <History className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-[#0b1120] mb-3">Execution History</h2>
            <p className="text-slate-600 leading-relaxed mb-8 text-sm">
              Review prior submissions, evaluate runtime complexity, and retrieve historic source code.
            </p>
          </div>
          <Link href={ROUTES.codingSubmissions} className="inline-flex items-center w-fit text-[#0b1120] font-semibold hover:text-blue-600 transition-colors">
            View Records
            <ArrowRight className="w-4 h-4 ml-2" strokeWidth={2} />
          </Link>
        </div>

      </div>

      {/* Activity Log */}
      {sessions.length > 0 && (
        <div className="glass-card rounded-2xl border border-slate-200/60 bg-white/70 overflow-hidden">
          <div className="flex items-end justify-between border-b border-slate-100 px-6 py-5 bg-white/40">
            <h2 className="text-lg font-bold text-[#0b1120]">Recent Executions</h2>
            <Link href={ROUTES.codingSubmissions} className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              View all history
            </Link>
          </div>
          
          <div className="flex flex-col divide-y divide-slate-100">
            {sessions.slice(0, 5).map((s) => (
              <div 
                key={s.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 hover:bg-white/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {s.id.slice(0, 8).toUpperCase()}
                  </div>
                  
                  {s.solved ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#c3ff3d]/20 text-[#346538] text-[11px] font-bold tracking-wide uppercase">
                      Passed
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold tracking-wide uppercase">
                      Attempting
                    </span>
                  )}

                  <div className="text-sm text-slate-500 hidden sm:block">
                    {new Date(s.updated_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <div className="flex items-center gap-6 mt-3 sm:mt-0">
                  <div className="text-sm text-slate-500 font-medium">
                    {s.attempts_count} {s.attempts_count === 1 ? 'attempt' : 'attempts'}
                  </div>
                  <Link href={`${ROUTES.codingPractice}/${s.problem_version_id}`}>
                    <span className="text-sm font-semibold text-[#0b1120] hover:text-blue-600 transition-colors">
                      Resume
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
