'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge, Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { ProblemVersion } from '@/types/coding';

export default function PracticeListPage() {
  const [problems, setProblems] = useState<ProblemVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CodingApi.listPracticeProblems()
      .then((res) => setProblems(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Practice Problems</h1>
        <Link href={ROUTES.coding}><Button variant="ghost">Back</Button></Link>
      </div>

      <div className="grid gap-4">
        {problems.map((p) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardBody className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{p.title}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge>{p.difficulty}</Badge>
                  <span className="text-xs text-slate-500">v{p.version_number}</span>
                </div>
              </div>
              <Link href={ROUTES.codingPracticeProblem(p.id)}>
                <Button variant="brand" size="sm">Solve</Button>
              </Link>
            </CardBody>
          </Card>
        ))}
        {problems.length === 0 && (
          <p className="text-center text-slate-500 py-12">No practice problems available yet</p>
        )}
      </div>
    </div>
  );
}
