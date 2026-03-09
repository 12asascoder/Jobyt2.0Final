'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Conversation } from '@/types';
import { Spinner, Card, Avatar } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/auth.store';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Conversation[]>('/messages/conversations')
      .then((r) => setConversations(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Messages</h1>
      {conversations.length === 0 ? (
        <Card><div className="py-12 text-center text-gray-400">No conversations yet.</div></Card>
      ) : (
        <Card>
          <div className="divide-y divide-gray-100">
            {conversations.map((c) => {
              const otherId = user?.role === 'recruiter' ? c.applicant_id : c.recruiter_id;
              return (
                <Link key={c.id} href={ROUTES.messageThread(c.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <Avatar name={otherId} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{otherId.substring(0, 8)}…</p>
                    <p className="truncate text-xs text-gray-500">{(c as unknown as Record<string, string>).last_message || 'No messages yet'}</p>
                  </div>
                  <p className="shrink-0 text-xs text-gray-400">{formatDate(c.last_message_at)}</p>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
