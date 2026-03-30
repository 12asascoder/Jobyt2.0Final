'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ApiError, api } from '@/lib/api';
import { ROUTES } from '@/constants';
import { Card, CardBody, Spinner } from '@/components/ui';

type ApiParticipant = {
  name?: string | null;
  avatar?: string | null;
};

type ApiConversation = {
  id: string;
  participant?: ApiParticipant;
  recruiter_id?: string;
  applicant_id?: string;
  last_message?: string | null;
  updated_at?: string | null;
  last_message_at?: string | null;
  unread?: boolean;
};

type ConversationsPayload = {
  conversations?: ApiConversation[];
};

const getInitials = (name: string): string => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
};

const toConversations = (payload: unknown): ApiConversation[] => {
  if (!payload || typeof payload !== 'object') return [];

  const wrapped = payload as {
    data?: unknown;
    conversations?: unknown;
  };

  const nestedData = wrapped.data as ConversationsPayload | ApiConversation[] | undefined;
  const raw =
    wrapped.conversations ??
    (Array.isArray(nestedData) ? nestedData : nestedData?.conversations) ??
    [];

  if (!Array.isArray(raw)) return [];

  return raw.filter(
    (item): item is ApiConversation =>
      Boolean(item && typeof item === 'object' && typeof (item as ApiConversation).id === 'string'),
  );
};

export default function MessagesPage() {
  const router = useRouter();

  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ConversationsPayload | ApiConversation[]>('/messages/conversations');
      setConversations(toConversations(res));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load conversations';
      toast.error(message);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aTime = new Date(a.updated_at || a.last_message_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.last_message_at || 0).getTime();
      return bTime - aTime;
    });
  }, [conversations]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (sortedConversations.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardBody className="p-6 text-center space-y-1">
            <p className="font-medium text-slate-900">No conversations yet</p>
            <p className="text-sm text-slate-500">Messages from recruiters will appear here</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-2">
      {sortedConversations.map((conv) => {
        const name = conv.participant?.name?.trim() || 'Unknown user';
        const avatar = conv.participant?.avatar?.trim() || '';
        const timestamp = conv.updated_at || conv.last_message_at;

        return (
          <Card
            key={conv.id}
            className={`p-4 cursor-pointer transition hover:bg-slate-50 ${conv.unread ? 'bg-slate-50' : ''}`}
            onClick={() => router.push(ROUTES.messageThread(conv.id))}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden text-sm font-semibold text-slate-700">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt={name} className="h-full w-full object-cover" />
                ) : (
                  getInitials(name)
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{name}</p>
                <p className="text-sm text-slate-500 truncate">{conv.last_message || 'No messages yet'}</p>
              </div>

              <div className="text-xs text-slate-500 shrink-0">
                {timestamp ? new Date(timestamp).toLocaleDateString() : '-'}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
