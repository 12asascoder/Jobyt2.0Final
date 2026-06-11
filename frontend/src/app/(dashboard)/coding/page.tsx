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
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  const accuracy = progress && progress.totalAttempts > 0 
    ? Math.round((progress.solved / progress.totalAttempts) * 100) 
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 pb-32 font-sans">
      
      {/* Hero Section */}
      <div className="mb-20">
        <h1 className="text-4xl md:text-6xl font-bold text-[#111111] tracking-tight mb-6 font-display">
          Coding Practice.
        </h1>
        <p className="text-xl text-[#787774] max-w-2xl leading-relaxed mb-10">
          A minimalist environment to sharpen algorithms, prepare for technical interviews, and track your proficiency.
        </p>

        {progress && (
          <div className="flex gap-12 border-t border-[#EAEAEA] pt-8">
            <div>
              <div className="text-sm font-medium text-[#787774] uppercase tracking-widest mb-2">Problems Solved</div>
              <div className="text-4xl font-mono text-[#111111]">{progress.solved}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-[#787774] uppercase tracking-widest mb-2">Accuracy</div>
              <div className="text-4xl font-mono text-[#111111]">{accuracy}%</div>
            </div>
            <div>
              <div className="text-sm font-medium text-[#787774] uppercase tracking-widest mb-2">Total Attempts</div>
              <div className="text-4xl font-mono text-[#111111]">{progress.totalAttempts}</div>
            </div>
          </div>
        )}
      </div>

      {/* Primary Actions Grid */}
      <div className="grid md:grid-cols-2 gap-px bg-[#EAEAEA] border border-[#EAEAEA] mb-20">
        
        {/* Practice Block */}
        <div className="bg-[#FFFFFF] p-10 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7F6F3] text-[#111111] text-xs font-semibold tracking-wide uppercase mb-8">
              Terminal
            </div>
            <h2 className="text-2xl font-bold text-[#111111] mb-4">Algorithm Library</h2>
            <p className="text-[#787774] leading-relaxed mb-12">
              Access the curated dataset of coding challenges. Execute in the browser. No configuration required.
            </p>
          </div>
          <Link href={ROUTES.codingPractice} className="inline-flex items-center group w-fit">
            <span className="text-[#111111] font-semibold pb-1 border-b-2 border-[#111111] group-hover:border-transparent transition-colors">
              Begin Session
            </span>
            <ArrowRight className="w-5 h-5 ml-2 text-[#111111]" strokeWidth={2} />
          </Link>
        </div>

        {/* Submissions Block */}
        <div className="bg-[#FFFFFF] p-10 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7F6F3] text-[#111111] text-xs font-semibold tracking-wide uppercase mb-8">
              Log
            </div>
            <h2 className="text-2xl font-bold text-[#111111] mb-4">Execution History</h2>
            <p className="text-[#787774] leading-relaxed mb-12">
              Review prior submissions, evaluate runtime complexity, and retrieve historic source code.
            </p>
          </div>
          <Link href={ROUTES.codingSubmissions} className="inline-flex items-center group w-fit">
            <span className="text-[#111111] font-semibold pb-1 border-b-2 border-[#111111] group-hover:border-transparent transition-colors">
              View Records
            </span>
            <ArrowRight className="w-5 h-5 ml-2 text-[#111111]" strokeWidth={2} />
          </Link>
        </div>

      </div>

      {/* Activity Log */}
      {sessions.length > 0 && (
        <div>
          <div className="flex items-end justify-between border-b border-[#EAEAEA] pb-4 mb-6">
            <h2 className="text-xl font-bold text-[#111111]">Recent Executions</h2>
            <Link href={ROUTES.codingSubmissions} className="text-sm font-semibold text-[#787774] hover:text-[#111111] transition-colors">
              See all
            </Link>
          </div>
          
          <div className="flex flex-col border border-[#EAEAEA] bg-[#FFFFFF]">
            {sessions.slice(0, 5).map((s, index) => (
              <div 
                key={s.id} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-6 ${index !== 0 ? 'border-t border-[#EAEAEA]' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-12 mb-4 sm:mb-0">
                  <div className="font-mono text-sm text-[#111111]">
                    {s.id.slice(0, 8).toUpperCase()}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {s.solved ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538] text-xs font-bold tracking-wider uppercase">
                        Passed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[#FBF3DB] text-[#956400] text-xs font-bold tracking-wider uppercase">
                        Attempting
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-[#787774] font-mono">
                    {new Date(s.updated_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-sm text-[#787774]">
                    {s.attempts_count} {s.attempts_count === 1 ? 'attempt' : 'attempts'}
                  </div>
                  <Link href={`${ROUTES.codingPractice}/${s.problem_version_id}`}>
                    <span className="text-sm font-semibold text-[#111111] underline underline-offset-4 decoration-[#EAEAEA] hover:decoration-[#111111] transition-colors">
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
