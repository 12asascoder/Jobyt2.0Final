'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AutoApplyApi, AutoApplyPreferences, PreviewResult } from '@/lib/api/autoApply.api';
import { ROUTES, JOB_TYPES } from '@/constants';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AutoApplySettingsPage() {
  const [prefs, setPrefs] = useState<AutoApplyPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [consented, setConsented] = useState(false);
  const [limits, setLimits] = useState<{ usedToday: number; maxDaily: number; remaining: number } | null>(null);

  const [rolesInput, setRolesInput] = useState('');
  const [locationsInput, setLocationsInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prefRes, limitRes] = await Promise.all([
        AutoApplyApi.getPreferences(),
        AutoApplyApi.getLimits(),
      ]);
      const p = prefRes.data;
      if (p) {
        setPrefs(p);
        setRolesInput(p.target_roles.join(', '));
        setLocationsInput(p.target_locations.join(', '));
      }
      if (limitRes.data) {
        setLimits({
          usedToday: limitRes.data.usedToday,
          maxDaily: limitRes.data.maxDaily,
          remaining: limitRes.data.remaining,
        });
      }
    } catch {
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const savePrefs = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await AutoApplyApi.updatePreferences({
        match_threshold: prefs.match_threshold,
        approval_mode: prefs.approval_mode,
        target_roles: rolesInput.split(',').map((s) => s.trim()).filter(Boolean),
        target_locations: locationsInput.split(',').map((s) => s.trim()).filter(Boolean),
        target_job_types: prefs.target_job_types,
        excluded_companies: prefs.excluded_companies,
        excluded_keywords: prefs.excluded_keywords,
        digest_enabled: prefs.digest_enabled,
        base_resume_id: prefs.base_resume_id,
      });
      if (res.data) setPrefs(res.data);
      toast.success('Preferences saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const runPreview = async () => {
    setPreviewLoading(true);
    try {
      await savePrefs();
      const res = await AutoApplyApi.preview();
      setPreview(res.data || null);
    } catch {
      toast.error('Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const acknowledgeAndEnable = async () => {
    if (!consented) {
      toast.error('Please consent before enabling');
      return;
    }
    try {
      await AutoApplyApi.acknowledgePreview();
      await AutoApplyApi.updateStatus('enabled', true);
      toast.success('Auto-Apply enabled');
      void load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not enable';
      toast.error(msg);
    }
  };

  if (loading || !prefs) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  const canEnable = Boolean(preview) && consented;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-display text-[#0b1120]">Auto-Apply Settings</h1>
        <Link href={ROUTES.autoApply} className="text-sm font-semibold text-slate-600">← Queue</Link>
      </div>

      {limits && (
        <div className="bg-[#141414] rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm mb-6 w-fit">
          <span className="text-4xl font-bold text-[#c3ff3d] leading-none">
            {limits.usedToday} / {limits.maxDaily}
          </span>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-snug">
            Applied Today
          </span>
        </div>
      )}

      <div className="glass-card p-6 space-y-6 mb-6">
        <div>
          <label className="text-sm font-bold text-slate-600">Match threshold ({prefs.match_threshold}%)</label>
          <input
            type="range"
            min={50}
            max={95}
            value={prefs.match_threshold}
            onChange={(e) => setPrefs({ ...prefs, match_threshold: Number(e.target.value) })}
            className="w-full mt-2"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-600">Target roles (comma-separated)</label>
          <input
            value={rolesInput}
            onChange={(e) => setRolesInput(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Frontend Engineer, Data Analyst"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-600">Locations</label>
          <input
            value={locationsInput}
            onChange={(e) => setLocationsInput(e.target.value)}
            className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Remote, Bangalore"
          />
        </div>

        <div>
          <p className="text-sm font-bold text-slate-600 mb-2">Job types</p>
          <div className="flex flex-wrap gap-2">
            {JOB_TYPES.map((t) => {
              const selected = prefs.target_job_types.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    const next = selected
                      ? prefs.target_job_types.filter((x) => x !== t)
                      : [...prefs.target_job_types, t];
                    setPrefs({ ...prefs, target_job_types: next });
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    selected ? 'bg-[#c3ff3d] text-[#0b1120]' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-bold text-slate-600 mb-2">Approval mode</legend>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="radio"
              name="approval"
              checked={prefs.approval_mode === 'manual'}
              onChange={() => setPrefs({ ...prefs, approval_mode: 'manual' })}
            />
            <span className="text-sm">Ask me before each application (recommended)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="approval"
              checked={prefs.approval_mode === 'auto'}
              onChange={() => setPrefs({ ...prefs, approval_mode: 'auto' })}
            />
            <span className="text-sm">Apply automatically when matched</span>
          </label>
        </fieldset>

        <button
          onClick={() => void savePrefs()}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-[#0b1120] text-white text-sm font-bold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>

      <div className="glass-card p-6 space-y-4 mb-6">
        <h2 className="font-display text-xl text-[#0b1120]">Preview before enable</h2>
        <p className="text-sm text-slate-500">See which jobs would match today before activating Auto-Apply.</p>
        <button
          onClick={() => void runPreview()}
          disabled={previewLoading}
          className="px-4 py-2 rounded-lg border border-[#0b1120] text-sm font-bold"
        >
          {previewLoading ? 'Running preview…' : 'Preview today\'s matches'}
        </button>

        {preview && (
          <>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { n: preview.summary.total_scanned, l: 'Found' },
                { n: preview.summary.eligible, l: 'Eligible' },
                { n: preview.summary.excluded, l: 'Excluded' },
              ].map((s) => (
                <div key={s.l} className="bg-[#141414] rounded-xl px-4 py-3 text-center">
                  <div className="text-2xl font-bold text-[#c3ff3d]">{s.n}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">{s.l}</div>
                </div>
              ))}
            </div>
            <ul className="max-h-48 overflow-y-auto text-sm space-y-2 mt-4">
              {preview.eligible_jobs.slice(0, 10).map((j) => (
                <li key={j.job_id} className="border-b border-slate-100 pb-2">
                  <span className="font-semibold">{j.title}</span> — {j.company}{' '}
                  <span className="text-[#c3ff3d] font-bold">{j.match_score}%</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <label className="flex items-start gap-2 mt-4 cursor-pointer">
          <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} className="mt-1" />
          <span className="text-sm text-slate-600">
            I authorize Jobyt to apply on my behalf using my resume for matched jobs.
          </span>
        </label>

        <button
          onClick={() => void acknowledgeAndEnable()}
          disabled={!canEnable || prefs.status === 'enabled'}
          className="px-4 py-2 rounded-lg bg-[#c3ff3d] text-[#0b1120] text-sm font-bold disabled:opacity-40"
        >
          {prefs.status === 'enabled' ? 'Auto-Apply is enabled' : 'Enable Auto-Apply'}
        </button>
      </div>
    </div>
  );
}
