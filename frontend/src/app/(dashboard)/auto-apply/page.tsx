'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {
  FaBolt,
  FaTrash,
  FaCircleCheck,
  FaXmark,
  FaSpinner,
  FaGear,
  FaList,
  FaClockRotateLeft,
  FaPlus,
  FaTriangleExclamation,
  FaBriefcase,
  FaLocationDot,
  FaCircleInfo,
} from 'react-icons/fa6';

interface Preferences {
  is_active: boolean;
  job_titles: string[];
  locations: string[];
  job_types: string[];
  min_salary: number | null;
  max_applications_per_day: number;
}

interface LogEntry {
  id: string;
  job_id: string;
  status: 'pending' | 'applied' | 'failed';
  error_message: string | null;
  applied_at: string | null;
  created_at: string;
  jobs: {
    title: string;
    companyName: string;
    location: string;
    type?: string;
    salary_min?: number;
    salary_max?: number;
    application_questions?: any;
  };
}

interface DashboardData {
  preferences: Preferences;
  logs: LogEntry[];
  stats: {
    applied_last_24h: number;
  };
}

export default function AutoApplyDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'preferences' | 'queue' | 'history'>('preferences');
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);
  const [processingItems, setProcessingItems] = useState<Record<string, 'applying' | 'dismissing'>>({});
  
  // Dashboard data state
  const [preferences, setPreferences] = useState<Preferences>({
    is_active: false,
    job_titles: [],
    locations: [],
    job_types: [],
    min_salary: null,
    max_applications_per_day: 5,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({ applied_last_24h: 0 });

  // Preferences editing state
  const [isActiveEdit, setIsActiveEdit] = useState(false);
  const [jobTitlesEdit, setJobTitlesEdit] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [locationsEdit, setLocationsEdit] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');
  const [jobTypesEdit, setJobTypesEdit] = useState<string[]>([]);
  const [minSalaryEdit, setMinSalaryEdit] = useState<string>('');
  const [maxAppsEdit, setMaxAppsEdit] = useState(5);

  const fetchDashboardData = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setLoading(true);
    try {
      const res = await api.get<DashboardData>('/auto-apply/dashboard');
      if (res.data) {
        setPreferences(res.data.preferences);
        setLogs(res.data.logs);
        setStats(res.data.stats);

        // Sync edit states
        setIsActiveEdit(res.data.preferences.is_active);
        setJobTitlesEdit(res.data.preferences.job_titles);
        setLocationsEdit(res.data.preferences.locations);
        setJobTypesEdit(res.data.preferences.job_types);
        setMinSalaryEdit(res.data.preferences.min_salary?.toString() || '');
        setMaxAppsEdit(res.data.preferences.max_applications_per_day);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch dashboard data');
    } finally {
      if (showSkeleton) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      const res = await api.put<Preferences>('/auto-apply/preferences', {
        is_active: isActiveEdit,
        job_titles: jobTitlesEdit,
        locations: locationsEdit,
        job_types: jobTypesEdit,
        min_salary: minSalaryEdit.trim() === '' ? null : parseInt(minSalaryEdit, 10),
        max_applications_per_day: maxAppsEdit,
      });

      toast.success('Auto-Apply preferences saved successfully!');
      if (res.data) {
        setPreferences(res.data);
      }
      await fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleApplySingle = async (logId: string) => {
    setProcessingItems(prev => ({ ...prev, [logId]: 'applying' }));
    try {
      await api.post(`/auto-apply/apply/${logId}`, {});
      toast.success('Applied successfully!');
      await fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application');
      await fetchDashboardData(); // Refresh to show error state in logs
    } finally {
      setProcessingItems(prev => {
        const copy = { ...prev };
        delete copy[logId];
        return copy;
      });
    }
  };

  const handleDismissSingle = async (logId: string) => {
    setProcessingItems(prev => ({ ...prev, [logId]: 'dismissing' }));
    try {
      await api.delete(`/auto-apply/queue/${logId}`);
      toast.success('Job dismissed from queue.');
      await fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to dismiss job');
    } finally {
      setProcessingItems(prev => {
        const copy = { ...prev };
        delete copy[logId];
        return copy;
      });
    }
  };

  const handleApplyAll = async () => {
    setApplyingAll(true);
    try {
      const res = await api.post<{ appliedCount: number }>('/auto-apply/apply-all', {});
      const count = res.data?.appliedCount ?? 0;
      if (count > 0) {
        toast.success(`Successfully processed queue and submitted ${count} applications!`);
      } else {
        toast.error('No applications were processed. Check your daily limit or default resume settings.');
      }
      await fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process queue');
    } finally {
      setApplyingAll(false);
    }
  };

  const handleAddJobTitle = () => {
    const val = newTitle.trim();
    if (val && !jobTitlesEdit.includes(val)) {
      setJobTitlesEdit(prev => [...prev, val]);
      setNewTitle('');
    }
  };

  const handleRemoveJobTitle = (title: string) => {
    setJobTitlesEdit(prev => prev.filter(t => t !== title));
  };

  const handleAddLocation = () => {
    const val = newLocation.trim();
    if (val && !locationsEdit.includes(val)) {
      setLocationsEdit(prev => [...prev, val]);
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (loc: string) => {
    setLocationsEdit(prev => prev.filter(l => l !== loc));
  };

  const toggleJobType = (type: string) => {
    setJobTypesEdit(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const pendingQueue = logs.filter(log => log.status === 'pending');
  const processedHistory = logs.filter(log => log.status === 'applied' || log.status === 'failed');

  const progressPercentage = Math.min(
    (stats.applied_last_24h / preferences.max_applications_per_day) * 100,
    100
  );

  const formatJobType = (type?: string) => {
    if (!type) return '';
    return type.replace('_', '-').toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <FaSpinner className="text-[#C3FF3D] animate-spin text-5xl mb-4" />
        <p className="text-slate-500 font-semibold">Loading Auto-Apply Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] w-full ml-4 sm:ml-6 lg:ml-8 pr-4">
      {/* Welcome & Overview */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl lg:text-[52px] font-extrabold text-[#1a1a1a] tracking-tight leading-[1.05]">
            Auto-Apply Control Center
          </h1>
          <p className="text-slate-600 font-medium text-sm md:text-base mt-2">
            Automate your job applications and monitor matched openings.
          </p>
        </div>

        {/* Global Auto Apply Toggle Status Indicator */}
        <div className="flex items-center gap-3 bg-[#141414] border border-white/5 rounded-2xl p-4 shadow-xl">
          <div className="relative">
            <span className={`flex h-3.5 w-3.5 rounded-full ${preferences.is_active ? 'bg-lime-400' : 'bg-slate-500'}`}></span>
            {preferences.is_active && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75 left-0 top-0"></span>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
            <p className="text-white font-extrabold text-sm">{preferences.is_active ? 'ACTIVE & SCANNING' : 'DISABLED'}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Credits usage Card */}
        <div className="bg-[#141414] rounded-2xl p-5 border border-white/5 shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Daily Applications</span>
            <span className="text-lime-400 font-extrabold text-sm">
              {stats.applied_last_24h} / {preferences.max_applications_per_day}
            </span>
          </div>
          <div className="w-full bg-[#2a2a2a] rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-lime-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Resets daily based on your limit.</p>
        </div>

        {/* Queue size Card */}
        <div className="bg-[#141414] rounded-2xl p-5 border border-white/5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider block">Pending Match Queue</span>
            <span className="text-[36px] font-extrabold text-lime-400 leading-tight block mt-1">{pendingQueue.length}</span>
          </div>
          <FaList className="text-slate-600 text-3xl" />
        </div>

        {/* Total Processed Card */}
        <div className="bg-[#141414] rounded-2xl p-5 border border-white/5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider block">Completed Audits</span>
            <span className="text-[36px] font-extrabold text-lime-400 leading-tight block mt-1">
              {processedHistory.length}
            </span>
          </div>
          <FaClockRotateLeft className="text-slate-600 text-3xl" />
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="mb-8">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 py-3 px-6 text-sm font-bold border-b-2 transition-colors focus:outline-none ${
              activeTab === 'preferences'
                ? 'border-lime-500 text-lime-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FaGear className="text-base" />
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 py-3 px-6 text-sm font-bold border-b-2 transition-colors focus:outline-none ${
              activeTab === 'queue'
                ? 'border-lime-500 text-lime-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FaList className="text-base" />
            Queue ({pendingQueue.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-3 px-6 text-sm font-bold border-b-2 transition-colors focus:outline-none ${
              activeTab === 'history'
                ? 'border-lime-500 text-lime-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FaClockRotateLeft className="text-base" />
            History ({processedHistory.length})
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'preferences' && (
          <form onSubmit={handleSavePreferences} className="bg-white rounded-3xl p-6 md:p-8 shadow-md border border-slate-100 max-w-[900px]">
            <h3 className="text-xl font-extrabold text-[#1a1a1a] mb-6">Auto-Apply Configurations</h3>

            {/* Toggle Status */}
            <div className="mb-6 flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <h4 className="font-bold text-[#1a1a1a] text-sm md:text-base">Toggle Auto-Apply Engine</h4>
                <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                  When enabled, matched jobs will automatically appear in your queue.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActiveEdit}
                  onChange={(e) => setIsActiveEdit(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-[#C3FF3D]"></div>
              </label>
            </div>

            {/* Job Titles Tag Input */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Preferred Job Titles</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="e.g. Frontend Developer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddJobTitle();
                    }
                  }}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-lime-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddJobTitle}
                  className="bg-[#1a1a1a] text-white hover:bg-black rounded-xl px-4 flex items-center justify-center font-bold transition-colors"
                >
                  <FaPlus className="text-sm" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {jobTitlesEdit.length === 0 ? (
                  <span className="text-slate-400 text-xs italic">Matches all job titles.</span>
                ) : (
                  jobTitlesEdit.map(t => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 bg-slate-100 text-[#1a1a1a] text-xs font-bold px-3 py-1.5 rounded-full"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveJobTitle(t)}
                        className="text-slate-400 hover:text-slate-700 font-bold"
                      >
                        <FaXmark className="text-xs" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Type a title and press Enter or click plus to add.</p>
            </div>

            {/* Locations Tag Input */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Preferred Locations</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="e.g. Remote"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLocation();
                    }
                  }}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-lime-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddLocation}
                  className="bg-[#1a1a1a] text-white hover:bg-black rounded-xl px-4 flex items-center justify-center font-bold transition-colors"
                >
                  <FaPlus className="text-sm" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {locationsEdit.length === 0 ? (
                  <span className="text-slate-400 text-xs italic">Matches all locations.</span>
                ) : (
                  locationsEdit.map(l => (
                    <span
                      key={l}
                      className="inline-flex items-center gap-1.5 bg-slate-100 text-[#1a1a1a] text-xs font-bold px-3 py-1.5 rounded-full"
                    >
                      {l}
                      <button
                        type="button"
                        onClick={() => handleRemoveLocation(l)}
                        className="text-slate-400 hover:text-slate-700 font-bold"
                      >
                        <FaXmark className="text-xs" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Job Types Toggle Pills */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-3">Preferred Job Types</label>
              <div className="flex flex-wrap gap-2">
                {['full-time', 'part-time', 'contract', 'remote', 'internship'].map(type => {
                  const active = jobTypesEdit.includes(type);
                  return (
                    <button
                      type="button"
                      key={type}
                      onClick={() => toggleJobType(type)}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                        active
                          ? 'bg-[#C3FF3D] border-[#C3FF3D] text-black shadow-sm'
                          : 'bg-transparent border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {type.replace('_', '-').toUpperCase()}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Leave all toggles off to match any job type.</p>
            </div>

            {/* Min Salary Input */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Minimum Annual/Monthly Salary</label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={minSalaryEdit}
                onChange={(e) => setMinSalaryEdit(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-lime-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-2">Specify the minimum salary threshold. Leave blank to match any salary.</p>
            </div>

            {/* Slider for Max applications per day */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700">Max Applications per Day</label>
                <span className="text-sm font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                  {maxAppsEdit}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={maxAppsEdit}
                onChange={(e) => setMaxAppsEdit(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#C3FF3D]"
              />
              <p className="text-[11px] text-slate-400 mt-2">Limits the number of automatic applies executed each day.</p>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-100 pt-6">
              <button
                type="submit"
                disabled={savingPrefs}
                className="bg-[#C3FF3D] text-black font-extrabold text-sm rounded-full px-8 py-3 shadow-md hover:bg-[#aee62d] transition-colors flex items-center justify-center gap-2"
              >
                {savingPrefs ? (
                  <>
                    <FaSpinner className="animate-spin text-base" />
                    Saving Changes...
                  </>
                ) : (
                  'Save Auto-Apply Preferences'
                )}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'queue' && (
          <div>
            {/* Header Control */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4 bg-slate-50 border border-slate-200/50 rounded-2xl p-4">
              <div>
                <h3 className="font-extrabold text-[#1a1a1a] text-lg">Matched Opportunities ({pendingQueue.length})</h3>
                <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                  Review matched opportunities before they are processed or trigger them instantly.
                </p>
              </div>
              {pendingQueue.length > 0 && (
                <button
                  onClick={handleApplyAll}
                  disabled={applyingAll || stats.applied_last_24h >= preferences.max_applications_per_day}
                  className="bg-[#1a1a1a] text-white hover:bg-black font-extrabold text-xs md:text-sm rounded-full px-6 py-2.5 shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {applyingAll ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Applying All...
                    </>
                  ) : (
                    <>
                      <FaBolt className="text-lime-400" />
                      Apply All Matched ({pendingQueue.length})
                    </>
                  )}
                </button>
              )}
            </div>

            {/* List */}
            {pendingQueue.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center py-20 text-center rounded-3xl border-2 border-dashed border-slate-200 bg-white">
                <span className="text-5xl mb-4">🚀</span>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Queue is empty</h3>
                <p className="text-slate-500 text-sm max-w-[400px]">
                  No new matches found yet. Make sure your preferences are enabled and update them to expand match parameters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingQueue.map(item => {
                  const jobQuestions = Array.isArray(item.jobs.application_questions)
                    ? item.jobs.application_questions
                    : [];
                  const requiresQuestions = jobQuestions.some((q: any) => q.required);

                  const processing = processingItems[item.id];

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                    >
                      <div>
                        {/* Job & Company details */}
                        <div className="mb-4">
                          <h4 className="font-extrabold text-[#1a1a1a] text-[16px] line-clamp-1">
                            {item.jobs.title}
                          </h4>
                          <p className="text-slate-500 font-bold text-xs mt-0.5">{item.jobs.companyName}</p>
                        </div>

                        {/* Details Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {item.jobs.type && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-lime-100 text-lime-800 px-2.5 py-1 rounded-full">
                              <FaBriefcase className="text-[9px]" />
                              {formatJobType(item.jobs.type)}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                            <FaLocationDot className="text-[9px]" />
                            {item.jobs.location || 'Anywhere'}
                          </span>
                          
                          {/* Required Questions Warning Badge */}
                          {requiresQuestions && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full">
                              <FaTriangleExclamation className="text-[9px]" />
                              Questions Required
                            </span>
                          )}
                        </div>

                        {/* Warning description */}
                        {requiresQuestions && (
                          <div className="flex gap-2 items-start bg-amber-50 border border-amber-200/50 rounded-xl p-3 mb-4 text-[11px] text-amber-800 leading-tight">
                            <FaCircleInfo className="shrink-0 mt-0.5 text-amber-600" />
                            <span>
                              This job has questionnaire forms. Auto-apply cannot answer them. Please apply manually.
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="flex gap-3 items-center border-t border-slate-100 pt-4 mt-2">
                        {requiresQuestions ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/jobs/${item.job_id}`)}
                            className="flex-1 bg-slate-900 text-white hover:bg-black font-extrabold text-xs rounded-full py-2.5 text-center transition-colors"
                          >
                            Apply Manually
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApplySingle(item.id)}
                            disabled={!!processing || stats.applied_last_24h >= preferences.max_applications_per_day}
                            className="flex-1 bg-lime-400 hover:bg-lime-500 disabled:opacity-50 text-black font-extrabold text-xs rounded-full py-2.5 transition-colors flex items-center justify-center gap-1"
                          >
                            {processing === 'applying' ? (
                              <FaSpinner className="animate-spin text-sm" />
                            ) : (
                              'Apply Instantly'
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDismissSingle(item.id)}
                          disabled={!!processing}
                          className="w-10 h-10 border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors"
                          title="Dismiss opening"
                        >
                          {processing === 'dismissing' ? (
                            <FaSpinner className="animate-spin text-sm" />
                          ) : (
                            <FaTrash className="text-xs" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-md border border-slate-100">
            <h3 className="text-xl font-extrabold text-[#1a1a1a] mb-6">Auto-Apply Auditing Logs</h3>

            {processedHistory.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center py-16 text-center">
                <span className="text-4xl mb-4">🗓️</span>
                <h4 className="text-slate-800 font-bold text-base mb-1">No execution logs yet</h4>
                <p className="text-slate-500 text-sm max-w-[320px]">
                  Processed queue applications will appear in this audit list.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Job opening / Company</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4">Processed Date</th>
                      <th className="pb-3 pl-4">Details / Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedHistory.map(entry => {
                      const isSuccess = entry.status === 'applied';
                      const dateText = entry.applied_at
                        ? new Date(entry.applied_at).toLocaleDateString() + ' ' + new Date(entry.applied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : new Date(entry.created_at).toLocaleDateString();

                      return (
                        <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-sm">
                          {/* Job Details */}
                          <td className="py-4 pr-4">
                            <div className="font-extrabold text-[#1a1a1a]">{entry.jobs.title}</div>
                            <div className="text-slate-400 text-xs mt-0.5">{entry.jobs.companyName}</div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                                isSuccess
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {isSuccess ? (
                                <>
                                  <FaCircleCheck className="text-[10px]" />
                                  APPLIED
                                </>
                              ) : (
                                <>
                                  <FaXmark className="text-[10px]" />
                                  FAILED
                                </>
                              )}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="py-4 px-4 text-slate-500 text-xs whitespace-nowrap">
                            {dateText}
                          </td>

                          {/* Errors / Action */}
                          <td className="py-4 pl-4 max-w-[280px]">
                            {isSuccess ? (
                              <button
                                onClick={() => router.push('/applications')}
                                className="text-lime-600 hover:text-lime-700 font-bold text-xs underline"
                              >
                                View Application
                              </button>
                            ) : (
                              <div className="text-red-600 text-xs font-medium leading-tight flex items-start gap-1.5 bg-red-50 border border-red-100 rounded-lg p-2.5">
                                <FaTriangleExclamation className="shrink-0 mt-0.5 text-red-500" />
                                <span>{entry.error_message || 'Application failed.'}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
