'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CodingApi } from '@/lib/api/coding.api';
import { Button, Input } from '@/components/ui';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ROUTES } from '@/constants';
import toast from 'react-hot-toast';

export default function NewAssessmentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    passing_score: 70,
    time_limit_minutes: 60,
    max_attempts: 1,
    assessment_timing: 'post_apply' as 'during_apply' | 'post_apply',
    allow_resume: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await CodingApi.createAssessment(form);
      toast.success('Assessment created');
      if (res.data?.id) router.push(ROUTES.recruiterAssessmentDetail(res.data.id));
    } catch {
      toast.error('Failed to create assessment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Create Assessment</h1>
      <Card>
        <CardHeader><h2 className="font-semibold">Assessment Details</h2></CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <Input label="Passing Score (%)" type="number" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: parseInt(e.target.value) })} />
            <Input label="Time Limit (minutes)" type="number" value={form.time_limit_minutes} onChange={(e) => setForm({ ...form, time_limit_minutes: parseInt(e.target.value) })} />
            <Input label="Max Attempts" type="number" value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: parseInt(e.target.value) })} />
            <div>
              <label className="block text-sm font-medium mb-1">Assessment Timing</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.assessment_timing}
                onChange={(e) => setForm({ ...form, assessment_timing: e.target.value as 'during_apply' | 'post_apply' })}
              >
                <option value="post_apply">After Apply</option>
                <option value="during_apply">During Apply</option>
              </select>
            </div>
            <Button type="submit" variant="brand" isLoading={saving}>Create Assessment</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
