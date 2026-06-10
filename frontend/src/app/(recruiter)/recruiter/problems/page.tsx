'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Badge, Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { CodingProblem } from '@/types/coding';

export default function RecruiterProblemsPage() {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CodingApi.listProblems()
      .then((res) => setProblems(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Problem Bank</h1>
        <div className="flex gap-2">
          <Link href={ROUTES.recruiterCollections}><Button variant="outline">Collections</Button></Link>
          <Link href={ROUTES.recruiterProblemNew}><Button variant="brand">New Problem</Button></Link>
        </div>
      </div>

      <div className="grid gap-4">
        {problems.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{p.title}</h3>
              <div className="flex gap-2 mt-1">
                <Badge>{p.status}</Badge>
                <Badge>{p.difficulty}</Badge>
              </div>
            </div>
            <Link href={ROUTES.recruiterProblemDetail(p.id)}>
              <Button variant="outline" size="sm">Edit</Button>
            </Link>
          </div>
        ))}
        {problems.length === 0 && <p className="text-center text-slate-500 py-12">No problems yet</p>}
      </div>
    </div>
  );
}
