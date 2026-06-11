'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { PracticeSession } from '@/types/coding';
import { 
  TerminalSquare, 
  History, 
  Code2, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  ArrowRight,
  Trophy
} from 'lucide-react';

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
    <div className="max-w-6xl mx-auto px-4 py-8 pb-20">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0b1120] text-white p-8 md:p-12 mb-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#c3ff3d]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#c3ff3d] text-sm font-medium mb-6">
              <TerminalSquare className="w-4 h-4" />
              <span>Coding Arena</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display tracking-tight text-white">
              Sharpen your coding skills
            </h1>
            <p className="text-slate-400 text-lg md:text-xl mb-8 max-w-xl leading-relaxed">
              Solve real-world algorithmic challenges, practice for technical interviews, and track your growth over time.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link href={ROUTES.codingPractice}>
                <Button className="bg-[#c3ff3d] text-[#0b1120] hover:bg-[#b2e637] font-semibold px-8 py-6 rounded-full text-lg shadow-[0_0_20px_rgba(195,255,61,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(195,255,61,0.5)]">
                  Start Practicing
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Box inside Hero */}
          {progress && (
            <div className="w-full md:w-auto flex flex-row md:flex-col gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl">
              <div className="flex-1 text-center md:text-left">
                <div className="text-slate-400 text-sm font-medium mb-1">Problems Solved</div>
                <div className="text-3xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                  <Trophy className="w-6 h-6 text-[#c3ff3d]" />
                  {progress.solved}
                </div>
              </div>
              <div className="hidden md:block w-full h-px bg-white/10 my-2" />
              <div className="hidden md:block w-px h-full bg-white/10 mx-2 md:hidden" />
              <div className="flex-1 text-center md:text-left">
                <div className="text-slate-400 text-sm font-medium mb-1">Accuracy</div>
                <div className="text-3xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                  <Activity className="w-6 h-6 text-[#c3ff3d]" />
                  {accuracy}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-10">
        {/* Practice Module Card */}
        <Link href={ROUTES.codingPractice} className="block group">
          <Card className="h-full border-slate-200 hover:border-[#c3ff3d] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-[#c3ff3d]/10 transition-colors" />
            <CardBody className="p-8 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-6 group-hover:bg-[#0b1120] group-hover:text-[#c3ff3d] transition-colors text-slate-700">
                <Code2 className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Practice Problems</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Dive into our extensive library of coding challenges. Filter by difficulty, tags, and start coding in our integrated browser IDE.
              </p>
              <div className="flex items-center text-sm font-semibold text-[#0b1120] group-hover:text-blue-600 transition-colors">
                Browse challenges <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardBody>
          </Card>
        </Link>

        {/* Submissions Module Card */}
        <Link href={ROUTES.codingSubmissions} className="block group">
          <Card className="h-full border-slate-200 hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/5 transition-colors" />
            <CardBody className="p-8 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-6 group-hover:bg-blue-500 group-hover:text-white transition-colors text-slate-700">
                <History className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Submission History</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Review your past submissions, check execution time, memory usage, and learn from your previous attempts and mistakes.
              </p>
              <div className="flex items-center text-sm font-semibold text-[#0b1120] group-hover:text-blue-600 transition-colors">
                View history <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      {sessions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Recent Activity</h2>
            <Link href={ROUTES.codingSubmissions} className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {sessions.slice(0, 5).map((s) => (
                <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${s.solved ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      {s.solved ? <CheckCircle2 className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        Session {s.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-sm text-slate-500">
                        {new Date(s.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className={`font-medium ${s.solved ? 'text-green-600' : 'text-slate-600'}`}>
                        {s.solved ? 'Solved' : 'Attempting'}
                      </div>
                      <div className="text-sm text-slate-500">
                        {s.attempts_count} {s.attempts_count === 1 ? 'attempt' : 'attempts'}
                      </div>
                    </div>
                    <Link href={`${ROUTES.codingPractice}/${s.problem_version_id}`}>
                      <Button variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Resume
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
