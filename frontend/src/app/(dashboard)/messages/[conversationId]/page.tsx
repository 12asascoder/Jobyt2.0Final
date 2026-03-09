'use client';

import { useEffect, useState, useRef } from 'react';
import { api, ApiError } from '@/lib/api';
import { Message } from '@/types';
import { Spinner, Button } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { connectSocket, joinConversation } from '@/lib/socket';
import toast from 'react-hot-toast';

export default function MessageThreadPage({ params }: { params: { conversationId: string } }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<Message[]>(`/messages/conversations/${params.conversationId}`)
      .then((r) => {
        setMessages(r.data);
        // Determine recipient from first message
        if (r.data.length > 0) {
          const first = r.data[0];
          setRecipientId(first.sender_id === user?.id ? '' : first.sender_id);
        }
      })
      .finally(() => setLoading(false));

    const socket = connectSocket();
    joinConversation(params.conversationId);
    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => { socket.off('new_message'); };
  }, [params.conversationId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!body.trim() || !recipientId) return;
    setSending(true);
    try {
      const res = await api.post<Message>(`/messages/conversations/${params.conversationId}`, { body, recipientId });
      setMessages((prev) => [...prev, res.data]);
      setBody('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Conversation</h1>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                <p>{msg.body}</p>
                <p className={`mt-1 text-[10px] ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{formatDate(msg.created_at, { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex-shrink-0 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button onClick={handleSend} isLoading={sending} disabled={!body.trim()}>Send</Button>
      </div>
    </div>
  );
}
