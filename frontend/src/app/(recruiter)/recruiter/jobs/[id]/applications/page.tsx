'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import toast from 'react-hot-toast';
import { Application, ApplicationStatus } from '@/types';
import { useApplications } from '@/hooks/useApplications';
import { Button, Spinner, Badge, Avatar } from '@/components/ui';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS, APPLICATION_STATUSES, ROUTES } from '@/constants';
import { formatDate } from '@/lib/utils';
import { createConversation } from '@/lib/messages';

interface ApplicantProfile {
  name: string | null;
  photo_url: string | null;
  skills: string[];
  resume_url: string | null;
}

interface ApplicationWithProfile extends Application {
  profile?: ApplicantProfile;
  name?: string;
  matchScore?: number;
}

import { ApplicationTimeline } from '@/components/applications/ApplicationTimeline';

export default function JobApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const { applications, total, isLoading, fetchJobApplications, updateStatus } = useApplications();
  const [selected, setSelected] = useState<ApplicationWithProfile | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');
  const [timelineAppId, setTimelineAppId] = useState<string | null>(null);

  // Interview Invite Modal State
  const [inviteAppId, setInviteAppId] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Broadcast Modal State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastChannels, setBroadcastChannels] = useState<string[]>(['in_app', 'email']);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    fetchJobApplications(jobId);
  }, [jobId, fetchJobApplications]);

  const filtered = filter === 'all' ? applications : applications.filter((a) => a.status === filter);

  const handleStatusChange = async (appId: string, status: ApplicationStatus) => {
    await updateStatus(appId, status);
    if (selected?.id === appId) setSelected((prev) => prev ? { ...prev, status } : prev);
  };

  const handleMessageCandidate = async (recipientId: string) => {
    try {
      const conversationId = await createConversation(recipientId, jobId);
      router.push(ROUTES.messageThread(conversationId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to start conversation');
    }
  };

  const handleViewResume = async (appId: string) => {
    try {
      const res = await api.get<{ url: string }>(`/applications/${appId}/resume-url`);
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        toast.error('Resume URL not found');
      }
    } catch (err) {
      toast.error('Failed to load secure resume URL');
    }
  };

  const handleSendInvite = async () => {
    if (!inviteAppId || !scheduledAt || !locationOrLink) {
      return toast.error('Please fill in required fields');
    }
    setIsInviting(true);
    try {
      await api.post(`/jobs/${jobId}/applications/${inviteAppId}/interview-invite`, {
        scheduledAt,
        locationOrLink,
        notes
      });
      toast.success('Interview invitation sent!');
      setInviteAppId(null);
      setScheduledAt('');
      setLocationOrLink('');
      setNotes('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return toast.error('Message body is required');
    if (broadcastChannels.length === 0) return toast.error('Select at least one delivery channel');
    
    setIsBroadcasting(true);
    try {
      await api.post(`/jobs/${jobId}/broadcast`, {
        messageBody: broadcastMessage,
        channels: broadcastChannels
      });
      toast.success('Broadcast sent to active applicants successfully!');
      setIsBroadcastModalOpen(false);
      setBroadcastMessage('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send broadcast');
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Pipeline</h1>
          <p className="text-sm text-gray-400">Drag and drop candidates to update their stage.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsBroadcastModalOpen(true)}>Broadcast Message</Button>
          <Link href={`/recruiter/jobs/${jobId}`}>
            <Button variant="outline" size="sm">← Back to Job</Button>
          </Link>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All ({applications.length})
        </button>
        {APPLICATION_STATUSES.map((s) => {
          const count = applications.filter((a) => a.status === s).length;
          if (count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {APPLICATION_STATUS_LABELS[s]} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-gray-400">No applications in this category.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            (() => {
              const appView = app as ApplicationWithProfile;
              return (
            <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <Avatar name={appView.name ?? 'A'} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 text-lg">{appView.name ?? 'Applicant'}</p>
                    {appView.matchScore !== undefined && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${appView.matchScore >= 80 ? 'bg-green-100 text-green-700' : appView.matchScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {appView.matchScore}% Match
                      </span>
                    )}
                    {app.submission_source === 'auto_apply' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#c3ff3d]/20 text-[#0b1120] border border-[#c3ff3d]/30">
                        Auto-Applied via Jobyt
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">Applied {formatDate(app.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <span className={`rounded-xl px-3 py-1 text-xs font-extrabold shadow-sm ${APPLICATION_STATUS_COLORS[app.status]}`}>
                  {APPLICATION_STATUS_LABELS[app.status]}
                </span>
                <select
                  value={app.status}
                  onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none"
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={() => setTimelineAppId(app.id)}>Timeline</Button>
                <Button size="sm" variant="outline" className="text-lime-600 border-lime-200 bg-lime-50 hover:bg-lime-100" onClick={() => setInviteAppId(app.id)}>Invite</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleMessageCandidate(app.applicant_id)}
                >
                  Message Candidate
                </Button>
                {app.resume_snapshot_url && (
                  <Button size="sm" variant="outline" onClick={() => void handleViewResume(app.id)}>
                    Resume
                  </Button>
                )}
              </div>
            </div>
              );
            })()
          ))}
        </div>
      )}

      {/* Timeline Modal */}
      {timelineAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 !m-0">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900">Application Timeline</h3>
              <button onClick={() => setTimelineAppId(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 focus:outline-none">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <ApplicationTimeline applicationId={timelineAppId} />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setTimelineAppId(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Invite Modal */}
      {inviteAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 !m-0">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900">Schedule Interview</h3>
              <button onClick={() => setInviteAppId(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 focus:outline-none">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location or Meeting Link</label>
                <input
                  type="text"
                  value={locationOrLink}
                  onChange={e => setLocationOrLink(e.target.value)}
                  placeholder="e.g. Google Meet link or office address"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Instructions for the candidate..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setInviteAppId(null)}>Cancel</Button>
              <Button onClick={handleSendInvite} isLoading={isInviting} className="bg-[#c3ff3d] text-black hover:bg-[#aee62d]">
                Send Invite
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Broadcast to Active Applicants</h2>
            <p className="mb-4 text-sm text-gray-500">Send a message to all applicants who are not rejected, hired, or withdrawn.</p>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Message Body</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full rounded-xl border p-3 focus:border-blue-500 focus:outline-none"
                  rows={4}
                  placeholder="Hello applicants, we have an update regarding the hiring process..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Channels</label>
                <div className="flex gap-4">
                  {['in_app', 'email', 'whatsapp'].map(ch => (
                    <label key={ch} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={broadcastChannels.includes(ch)}
                        onChange={(e) => {
                          if (e.target.checked) setBroadcastChannels([...broadcastChannels, ch]);
                          else setBroadcastChannels(broadcastChannels.filter(c => c !== ch));
                        }}
                      />
                      <span className="text-sm">{ch.replace('_', ' ').toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsBroadcastModalOpen(false)}>Cancel</Button>
                <Button onClick={() => void handleSendBroadcast()} disabled={isBroadcasting}>
                  {isBroadcasting ? 'Sending...' : 'Send Broadcast'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
