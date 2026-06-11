'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { PracticeSession } from '@/types/coding';
import { ArrowRight } from 'lucide-react';

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
    <div className="max-w-5xl mx-auto px-4 py-8 pb-16 font-sans">
      
      {/* Hero Section */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-[#111111] tracking-tight mb-2 font-display">
          Coding Practice
        </h1>
        <p className="text-[#787774] mb-8">
          Sharpen your algorithms and track your proficiency.
        </p>

        {progress && (
          <div className="flex flex-wrap gap-4">
            <div className="bg-[#141414] rounded-xl px-6 py-4 flex items-center gap-4 min-w-[200px]">
              <span className="text-4xl font-bold text-[#c3ff3d] leading-none">
                {progress.solved}
              </span>
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest leading-tight">
                Problems<br />Solved
              </span>
            </div>
            <div className="bg-[#141414] rounded-xl px-6 py-4 flex items-center gap-4 min-w-[200px]">
              <span className="text-4xl font-bold text-[#c3ff3d] leading-none">
                {accuracy}%
              </span>
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest leading-tight">
                Accuracy<br />Rate
              </span>
            </div>
            <div className="bg-[#141414] rounded-xl px-6 py-4 flex items-center gap-4 min-w-[200px]">
              <span className="text-4xl font-bold text-[#c3ff3d] leading-none">
                {progress.totalAttempts}
              </span>
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest leading-tight">
                Total<br />Attempts
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Primary Actions Grid */}
      <div className="grid md:grid-cols-2 gap-px bg-[#EAEAEA] border border-[#EAEAEA] mb-12">
        
        {/* Practice Block */}
        <div className="bg-[#FFFFFF] p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#111111] mb-2">Algorithm Library</h2>
            <p className="text-[#787774] leading-relaxed mb-8 text-sm">
              Access the curated dataset of coding challenges. Execute in the browser. No configuration required.
            </p>
          </div>
          <Link href={ROUTES.codingPractice} className="inline-flex items-center group w-fit">
            <span className="text-[#111111] text-sm font-semibold pb-1 border-b-2 border-[#111111] group-hover:border-transparent transition-colors">
              Begin Session
            </span>
            <ArrowRight className="w-4 h-4 ml-2 text-[#111111]" strokeWidth={2} />
          </Link>
        </div>

        {/* Submissions Block */}
        <div className="bg-[#FFFFFF] p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#111111] mb-2">Execution History</h2>
            <p className="text-[#787774] leading-relaxed mb-8 text-sm">
              Review prior submissions, evaluate runtime complexity, and retrieve historic source code.
            </p>
          </div>
          <Link href={ROUTES.codingSubmissions} className="inline-flex items-center group w-fit">
            <span className="text-[#111111] text-sm font-semibold pb-1 border-b-2 border-[#111111] group-hover:border-transparent transition-colors">
              View Records
            </span>
            <ArrowRight className="w-4 h-4 ml-2 text-[#111111]" strokeWidth={2} />
          </Link>
        </div>

      </div>

      {/* Activity Log */}
      {sessions.length > 0 && (
        <div>
          <div className="flex items-end justify-between border-b border-[#EAEAEA] pb-3 mb-4">
            <h2 className="text-lg font-bold text-[#111111]">Recent Executions</h2>
            <Link href={ROUTES.codingSubmissions} className="text-sm font-semibold text-[#787774] hover:text-[#111111] transition-colors">
              See all
            </Link>
          </div>
          
          <div className="flex flex-col border border-[#EAEAEA] bg-[#FFFFFF]">
            {sessions.slice(0, 5).map((s, index) => (
              <div 
                key={s.id} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 ${index !== 0 ? 'border-t border-[#EAEAEA]' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="font-mono text-xs text-[#111111]">
                    {s.id.slice(0, 8).toUpperCase()}
                  </div>
                  
                  {s.solved ? (
                    <span className="px-2 py-0.5 rounded-sm bg-[#EDF3EC] text-[#346538] text-[10px] font-bold tracking-wider uppercase">
                      Passed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-sm bg-[#FBF3DB] text-[#956400] text-[10px] font-bold tracking-wider uppercase">
                      Attempting
                    </span>
                  )}

                  <div className="text-xs text-[#787774] font-mono hidden sm:block">
                    {new Date(s.updated_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <div className="flex items-center gap-6 mt-3 sm:mt-0">
                  <div className="text-xs text-[#787774]">
                    {s.attempts_count} {s.attempts_count === 1 ? 'attempt' : 'attempts'}
                  </div>
                  <Link href={`${ROUTES.codingPractice}/${s.problem_version_id}`}>
                    <span className="text-xs font-semibold text-[#111111] underline underline-offset-4 decoration-[#EAEAEA] hover:decoration-[#111111] transition-colors">
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
