'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AutoApplyApi, QueueItem } from '@/lib/api/autoApply.api';
import { ROUTES } from '@/constants';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

const TABS = ['pending_approval', 'submitted', 'skipped', 'failed'] as const;

export default function AutoApplyDashboardPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<string>('pending_approval');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, statsRes] = await Promise.all([
        AutoApplyApi.listQueue({ status: tab, page: 1 }),
        AutoApplyApi.getQueueStats(),
      ]);
      setItems(Array.isArray(queueRes.data) ? queueRes.data : []);
      setStats(statsRes.data || {});
    } catch {
      toast.error('Failed to load Auto-Apply queue');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (id: string) => {
    try {
      await AutoApplyApi.approve(id);
      toast.success('Approved and submitted');
      void load();
    } catch {
      toast.error('Approval failed');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await AutoApplyApi.reject(id);
      toast.success('Skipped');
      void load();
    } catch {
      toast.error('Could not skip item');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display text-[#0b1120]">Auto-Apply</h1>
          <p className="text-sm text-slate-500 mt-1">Review matches and applications Jobyt submits for you.</p>
        </div>
        <Link
          href={ROUTES.autoApplySettings}
          className="px-4 py-2 rounded-xl bg-[#c3ff3d] text-[#0b1120] text-sm font-bold"
        >
          Settings
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pending', key: 'pending_approval', value: stats.pending_approval || 0 },
          { label: 'Submitted', key: 'submitted', value: stats.submitted || 0 },
          { label: 'Skipped', key: 'skipped', value: stats.skipped || 0 },
          { label: 'Failed', key: 'failed', value: stats.failed || 0 },
        ].map((s) => (
          <div key={s.key} className="bg-[#141414] rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm">
            <span className="text-4xl font-bold text-[#c3ff3d] leading-none">{s.value}</span>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-snug">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
              tab === t ? 'bg-[#0b1120] text-[#c3ff3d]' : 'bg-white/80 text-slate-600'
            }`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-slate-500 mb-4">No items in this tab.</p>
          <Link href={ROUTES.autoApplySettings} className="text-[#0b1120] font-bold underline">
            Configure Auto-Apply
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="glass-card p-5 job-card">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg text-[#0b1120]">{item.job_title || 'Job'}</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{item.company_name}</p>
                  {item.match_score != null && (
                    <p className="text-2xl font-bold text-[#c3ff3d] mt-2">{item.match_score}% match</p>
                  )}
                  {item.match_reason?.human_summary && (
                    <p className="text-sm text-slate-600 mt-2">{item.match_reason.human_summary}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {item.status === 'pending_approval' && (
                    <>
                      <button
                        onClick={() => void handleApprove(item.id)}
                        className="px-4 py-2 rounded-lg bg-[#c3ff3d] text-[#0b1120] text-sm font-bold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => void handleReject(item.id)}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold"
                      >
                        Skip
                      </button>
                    </>
                  )}
                  <Link
                    href={ROUTES.autoApplyQueueItem(item.id)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
