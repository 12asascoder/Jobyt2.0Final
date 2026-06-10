'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Badge, Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { CodingAssessment } from '@/types/coding';

export default function RecruiterAssessmentsPage() {
  const [assessments, setAssessments] = useState<CodingAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CodingApi.listAssessments()
      .then((res) => setAssessments(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Coding Assessments</h1>
        <Link href={ROUTES.recruiterAssessmentNew}><Button variant="brand">New Assessment</Button></Link>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#1a1a1a] text-lime-300">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Passing Score</th>
              <th className="px-4 py-3 text-left">Timing</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {assessments.map((a) => (
              <tr key={a.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{a.title}</td>
                <td className="px-4 py-3"><Badge>{a.status}</Badge></td>
                <td className="px-4 py-3">{a.passing_score}%</td>
                <td className="px-4 py-3">{a.assessment_timing}</td>
                <td className="px-4 py-3 flex gap-3">
                  <Link href={ROUTES.recruiterAssessmentDetail(a.id)} className="text-blue-600 hover:underline">Edit</Link>
                  {a.status === 'published' && (
                    <Link href={ROUTES.recruiterAssessmentVersions(a.id)} className="text-blue-600 hover:underline">Versions</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {assessments.length === 0 && <p className="text-center text-slate-500 py-12">No assessments yet</p>}
      </div>
    </div>
  );
}
