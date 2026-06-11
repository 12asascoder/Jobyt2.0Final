'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { ProblemVersion } from '@/types/coding';
import { ArrowLeft, Play, Code2 } from 'lucide-react';

export default function PracticeListPage() {
  const [problems, setProblems] = useState<ProblemVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CodingApi.listPracticeProblems()
      .then((res) => setProblems(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-[40vh]"><Spinner /></div>;

  return (
    <div className="max-w-[1400px] ml-4 sm:ml-6 lg:ml-8 pr-4 py-8 pb-20 font-sans">
      
      {/* Header Section */}
      <div className="mb-10">
        <Link 
          href={ROUTES.coding} 
          className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-[#0b1120] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Arena
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0b1120] tracking-tight mb-2 font-display">
              Practice Problems
            </h1>
            <p className="text-slate-500 max-w-xl">
              Sharpen your algorithmic skills with our curated library of coding challenges. 
              Select a problem to enter the browser-based execution environment.
            </p>
          </div>
          <div className="bg-slate-100 rounded-lg px-4 py-2 flex items-center gap-3 w-fit text-sm font-medium text-slate-600">
            <Code2 className="w-4 h-4" />
            <span>{problems.length} Problems Available</span>
          </div>
        </div>
      </div>

      {/* Problems List */}
      <div className="grid gap-4">
        {problems.map((p) => {
          // Determine difficulty colors based on the Jobyt palette style
          const isEasy = p.difficulty.toLowerCase() === 'easy';
          const isMedium = p.difficulty.toLowerCase() === 'medium';
          
          const badgeBg = isEasy ? 'bg-[#c3ff3d]/20' : isMedium ? 'bg-amber-100' : 'bg-[#ff6b6b]/20';
          const badgeText = isEasy ? 'text-[#346538]' : isMedium ? 'text-amber-700' : 'text-[#b91c1c]';

          return (
            <div 
              key={p.id} 
              className="glass-card job-card rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/70 border border-slate-200/60 group cursor-pointer"
              onClick={() => window.location.href = ROUTES.codingPracticeProblem(p.id)}
            >
              <div className="flex items-start sm:items-center gap-5">
                {/* Visual Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isEasy ? 'bg-[#EDF3EC] text-[#346538]' : 
                  isMedium ? 'bg-[#FBF3DB] text-amber-700' : 
                  'bg-[#fce8e8] text-[#b91c1c]'
                }`}>
                  <Code2 className="w-6 h-6" />
                </div>
                
                {/* Content */}
                <div>
                  <h3 className="text-lg font-bold text-[#0b1120] mb-1.5 group-hover:text-blue-600 transition-colors">
                    {p.title}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-md ${badgeBg} ${badgeText} text-[11px] font-bold tracking-wide uppercase`}>
                      {p.difficulty}
                    </span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      v{p.version_number}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Link href={ROUTES.codingPracticeProblem(p.id)} onClick={(e) => e.stopPropagation()}>
                <button className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#0b1120] text-[#c3ff3d] text-sm font-semibold hover:bg-slate-800 hover:shadow-lg transition-all active:scale-95">
                  <Play className="w-4 h-4 mr-2" fill="currentColor" />
                  Solve
                </button>
              </Link>
            </div>
          );
        })}

        {problems.length === 0 && (
          <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white/50 border border-slate-200/50">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
              <Code2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#0b1120] mb-2">No problems yet</h3>
            <p className="text-slate-500 max-w-sm">
              Practice problems are currently being curated. Check back later to start your coding sessions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
