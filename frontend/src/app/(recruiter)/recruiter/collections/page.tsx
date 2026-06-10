'use client';

import { useEffect, useState } from 'react';
import { CodingApi } from '@/lib/api/coding.api';
import { Button, Input, Spinner } from '@/components/ui';
import { Card, CardBody } from '@/components/ui/Card';
import { ProblemCollection } from '@/types/coding';
import toast from 'react-hot-toast';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<ProblemCollection[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    CodingApi.listCollections()
      .then((res) => setCollections(res.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await CodingApi.createCollection(name.trim());
    toast.success('Collection created');
    setName('');
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Problem Collections</h1>

      <Card className="mb-6">
        <CardBody className="flex gap-2">
          <Input placeholder="Collection name (e.g. Backend Screening)" value={name} onChange={(e) => setName(e.target.value)} />
          <Button variant="brand" onClick={handleCreate}>Create</Button>
        </CardBody>
      </Card>

      <div className="grid gap-3">
        {collections.map((c) => (
          <Card key={c.id}>
            <CardBody className="flex justify-between">
              <div>
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-sm text-slate-500">{c.problem_count ?? 0} problems</p>
              </div>
            </CardBody>
          </Card>
        ))}
        {collections.length === 0 && <p className="text-center text-slate-500 py-8">No collections yet</p>}
      </div>
    </div>
  );
}
