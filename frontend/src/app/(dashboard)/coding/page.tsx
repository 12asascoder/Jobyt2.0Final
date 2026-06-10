'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { PracticeSession } from '@/types/coding';

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

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Coding</h1>
      <p className="text-slate-600 mb-8">Practice problems and take coding assessments</p>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader><h2 className="font-semibold">Practice</h2></CardHeader>
          <CardBody>
            <p className="text-sm text-slate-600 mb-4">Solve coding problems at your own pace</p>
            {progress && (
              <p className="text-sm mb-4">{progress.solved} solved · {progress.totalAttempts} attempts</p>
            )}
            <Link href={ROUTES.codingPractice}>
              <Button variant="brand">Browse Problems</Button>
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold">Submissions</h2></CardHeader>
          <CardBody>
            <p className="text-sm text-slate-600 mb-4">View your submission history and results</p>
            <Link href={ROUTES.codingSubmissions}>
              <Button variant="outline">View History</Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      {sessions.length > 0 && (
        <Card>
          <CardHeader><h2 className="font-semibold">Recent Practice</h2></CardHeader>
          <CardBody className="space-y-2">
            {sessions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span>Session {s.id.slice(0, 8)}...</span>
                <span className={s.solved ? 'text-green-600' : 'text-slate-500'}>
                  {s.solved ? 'Solved' : `${s.attempts_count} attempts`}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
