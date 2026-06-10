'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Button, Input, Spinner } from '@/components/ui';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ROUTES } from '@/constants';
import { CodingProblem } from '@/types/coding';
import toast from 'react-hot-toast';

export default function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [problem, setProblem] = useState<CodingProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [tcForm, setTcForm] = useState({ input: '', expected_output: '', is_sample: true, is_hidden: false });
  const [publishing, setPublishing] = useState(false);

  const load = () => {
    CodingApi.getProblem(id)
      .then((res) => { if (res.data) setProblem(res.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleAddTestCase = async () => {
    await CodingApi.addTestCase(id, tcForm);
    toast.success('Test case added');
    setTcForm({ input: '', expected_output: '', is_sample: true, is_hidden: false });
    load();
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await CodingApi.publishProblem(id);
      toast.success('Problem published');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  if (loading || !problem) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <span className="text-sm text-slate-500">{problem.status} · v{problem.current_version_number || 0}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="brand" onClick={handlePublish} isLoading={publishing}>Publish</Button>
          <Link href={ROUTES.recruiterProblems}><Button variant="ghost">Back</Button></Link>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader><h2 className="font-semibold">Test Cases</h2></CardHeader>
        <CardBody>
          <div className="space-y-2 mb-4">
            {(problem.test_cases || []).map((tc) => (
              <div key={tc.id} className="text-sm border rounded p-2 flex justify-between">
                <div>
                  <span className="font-medium">{tc.is_sample ? 'Sample' : tc.is_hidden ? 'Hidden' : 'Visible'}</span>
                  <pre className="text-xs mt-1">In: {tc.input} → Out: {tc.expected_output}</pre>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-2">
            <Input label="Input" value={tcForm.input} onChange={(e) => setTcForm({ ...tcForm, input: e.target.value })} />
            <Input label="Expected Output" value={tcForm.expected_output} onChange={(e) => setTcForm({ ...tcForm, expected_output: e.target.value })} />
            <div className="flex gap-4 text-sm">
              <label><input type="checkbox" checked={tcForm.is_sample} onChange={(e) => setTcForm({ ...tcForm, is_sample: e.target.checked })} /> Sample</label>
              <label><input type="checkbox" checked={tcForm.is_hidden} onChange={(e) => setTcForm({ ...tcForm, is_hidden: e.target.checked })} /> Hidden</label>
            </div>
            <Button variant="outline" onClick={handleAddTestCase}>Add Test Case</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
