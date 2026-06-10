'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Badge, Button, Spinner } from '@/components/ui';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ROUTES } from '@/constants';
import { CodingAssessment, CodingProblem } from '@/types/coding';
import toast from 'react-hot-toast';

export default function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assessment, setAssessment] = useState<CodingAssessment | null>(null);
  const [allProblems, setAllProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    const [aRes, pRes] = await Promise.all([
      CodingApi.getAssessment(id),
      CodingApi.listProblems(),
    ]);
    if (aRes.data) setAssessment(aRes.data);
    setAllProblems(pRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [id]);

  const handleAttach = async (problemId: string) => {
    await CodingApi.attachProblem(id, problemId);
    toast.success('Problem attached');
    void load();
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await CodingApi.publishAssessment(id);
      toast.success('Assessment published');
      void load();
    } catch {
      toast.error('Publish failed — ensure all problems are published');
    } finally {
      setPublishing(false);
    }
  };

  if (loading || !assessment) return <div className="flex justify-center py-20"><Spinner /></div>;

  const attachedIds = new Set((assessment.problems || []).map((p) => p.id));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{assessment.title}</h1>
          <Badge className="mt-1">{assessment.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Link href={ROUTES.recruiterAssessmentVersions(id)}>
            <Button variant="outline">Version History</Button>
          </Link>
          <Button variant="brand" onClick={handlePublish} isLoading={publishing}>Publish</Button>
          <Link href={ROUTES.recruiterAssessments}><Button variant="ghost">Back</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><h2 className="font-semibold">Attached Problems</h2></CardHeader>
          <CardBody className="space-y-2">
            {(assessment.problems || []).map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span>{p.title}</span>
                <Badge>{p.difficulty}</Badge>
              </div>
            ))}
            {(assessment.problems || []).length === 0 && <p className="text-slate-500 text-sm">No problems attached</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold">Add Problems</h2></CardHeader>
          <CardBody className="space-y-2 max-h-64 overflow-y-auto">
            {allProblems.filter((p) => !attachedIds.has(p.id)).map((p) => (
              <div key={p.id} className="flex justify-between items-center text-sm">
                <span>{p.title}</span>
                <Button size="sm" variant="outline" onClick={() => handleAttach(p.id)}>Add</Button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
