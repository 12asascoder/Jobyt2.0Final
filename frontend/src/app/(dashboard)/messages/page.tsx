'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { api, ApiError } from '@/lib/api';
import { Conversation, Message } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { connectSocket, joinConversation, leaveConversation } from '@/lib/socket';
import { Spinner } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
    FaMagnifyingGlass,
    FaChevronDown,
    FaChevronUp,
} from 'react-icons/fa6';

export default function MessagesPage() {
    const { user } = useAuthStore();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingConvos, setLoadingConvos] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [msgBody, setMsgBody] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Fetch conversations on mount
    useEffect(() => {
        api.get<Conversation[]>('/messages/conversations')
            .then((res) => {
                setConversations(res.data || []);
                if (res.data?.length > 0) {
                    setSelectedId(res.data[0].id);
                }
            })
            .catch(() => setConversations([]))
            .finally(() => setLoadingConvos(false));
    }, []);

    // Fetch messages when selecting a conversation
    useEffect(() => {
        if (!selectedId) { setMessages([]); return; }
        setLoadingMessages(true);
        api.get<Message[]>(`/messages/conversations/${selectedId}`)
            .then((res) => setMessages(res.data || []))
            .catch(() => setMessages([]))
            .finally(() => setLoadingMessages(false));

        // Real-time socket
        const socket = connectSocket();
        joinConversation(selectedId);
        const handler = (msg: Message) => {
            if (msg.conversation_id === selectedId) {
                setMessages((prev) => [...prev, msg]);
            }
        };
        socket.on('new_message', handler);
        return () => {
            socket.off('new_message', handler);
            leaveConversation(selectedId);
        };
    }, [selectedId]);

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!msgBody.trim() || !selectedId) return;
        setSending(true);
        try {
            const selectedConvo = conversations.find((c) => c.id === selectedId);
            const recipientId = selectedConvo
                ? (selectedConvo.recruiter_id === user?.id ? selectedConvo.applicant_id : selectedConvo.recruiter_id)
                : '';
            const res = await api.post<Message>(`/messages/conversations/${selectedId}`, { body: msgBody, recipientId });
            setMessages((prev) => [...prev, res.data]);
            setMsgBody('');
            // Update last_message in the conversation list
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === selectedId ? { ...c, last_message: msgBody, last_message_at: new Date().toISOString() } : c
                )
            );
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const selectedConvo = conversations.find((c) => c.id === selectedId);

    const filteredConvos = conversations.filter((c) => {
        const otherUserId = c.recruiter_id === user?.id ? c.applicant_id : c.recruiter_id;
        return otherUserId.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (c.last_message || '').toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Helper: get display name for a conversation participant
    const getConvoDisplayName = (c: Conversation) => {
        const otherId = c.recruiter_id === user?.id ? c.applicant_id : c.recruiter_id;
        return `User ${otherId.substring(0, 8)}`;
    };

    const getConvoAvatar = (c: Conversation) => {
        const otherId = c.recruiter_id === user?.id ? c.applicant_id : c.recruiter_id;
        return `https://i.pravatar.cc/80?u=${otherId}`;
    };

    if (loadingConvos) {
        return (
            <div className="flex justify-center py-20">
                <Spinner size="lg" />
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="max-w-[1400px] mx-auto">
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-5xl mb-4">💬</p>
                    <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">No conversations yet</h2>
                    <p className="text-slate-500 font-medium max-w-md">
                        When you apply for jobs or recruiters reach out, your conversations will appear here.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col lg:flex-row gap-0 h-[calc(100vh-100px)] bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden shadow-sm">

                {/* ── LEFT: Conversation List ── */}
                <div className="w-full lg:w-[320px] shrink-0 border-r border-[#e8e4dc] flex flex-col">
                    {/* Search */}
                    <div className="p-4">
                        <div className="bg-[#1a1a1a] rounded-full h-10 flex items-center px-4 gap-2.5">
                            <FaMagnifyingGlass className="text-white/40 text-xs shrink-0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search"
                                className="flex-1 bg-transparent text-white text-sm placeholder-white/40 outline-none"
                            />
                        </div>
                    </div>

                    {/* Conversation items */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredConvos.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedId(c.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                    selectedId === c.id
                                        ? 'bg-lime-100 border-l-3 border-lime-400'
                                        : 'hover:bg-slate-50'
                                }`}
                            >
                                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200">
                                    <Image src={getConvoAvatar(c)} alt={getConvoDisplayName(c)} width={40} height={40} className="object-cover" unoptimized />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-[#1a1a1a] truncate">{getConvoDisplayName(c)}</p>
                                    <p className="text-xs text-slate-400 truncate">{c.last_message || 'No messages yet'}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── CENTER: Chat Area ── */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Chat header */}
                    {selectedConvo && (
                        <div className="px-6 py-4 border-b border-[#e8e4dc] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
                                <Image src={getConvoAvatar(selectedConvo)} alt={getConvoDisplayName(selectedConvo)} width={40} height={40} className="object-cover" unoptimized />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[#1a1a1a]">{getConvoDisplayName(selectedConvo)}</p>
                                <p className="text-xs text-slate-400">{formatDate(selectedConvo.last_message_at)}</p>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {loadingMessages ? (
                            <div className="flex justify-center py-10"><Spinner size="md" /></div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <p className="text-slate-400 text-sm font-medium">No messages in this conversation yet. Say hello!</p>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg) => {
                                    const isMe = msg.sender_id === user?.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[70%] rounded-2xl px-5 py-3 text-sm leading-relaxed whitespace-pre-line ${
                                                    isMe
                                                        ? 'bg-[#f4f1ea] text-[#1a1a1a] rounded-br-md'
                                                        : 'bg-lime-100 text-[#1a1a1a] rounded-bl-md'
                                                }`}
                                            >
                                                {msg.body}
                                                <p className={`mt-1 text-[10px] ${isMe ? 'text-slate-400' : 'text-lime-600'}`}>
                                                    {formatDate(msg.created_at, { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </>
                        )}
                    </div>

                    {/* Input */}
                    <div className="px-6 py-4 border-t border-[#e8e4dc]">
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={msgBody}
                                onChange={(e) => setMsgBody(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                className="flex-1 bg-[#f4f4f4] rounded-full text-sm px-5 py-3 outline-none"
                            />
                            <button
                                onClick={handleSend}
                                disabled={sending || !msgBody.trim()}
                                className="bg-lime-400 text-black w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm hover:bg-lime-300 transition-colors shrink-0 disabled:opacity-50"
                            >
                                {sending ? '…' : '↗'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: General Info Panel ── */}
                {selectedConvo && (
                    <div className="hidden xl:block w-[280px] shrink-0 border-l border-[#e8e4dc] overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-base font-bold text-[#1a1a1a] mb-5">General Info</h3>

                            {/* Contact card */}
                            <div className="bg-[#f9f8f5] rounded-2xl p-5 mb-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
                                        <Image src={getConvoAvatar(selectedConvo)} alt={getConvoDisplayName(selectedConvo)} width={40} height={40} className="object-cover" unoptimized />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#1a1a1a]">{getConvoDisplayName(selectedConvo)}</p>
                                        <p className="text-xs text-slate-400">{selectedConvo.job_id ? 'Job Conversation' : 'Direct Message'}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 text-xs">
                                    <div>
                                        <p className="text-slate-400 font-medium">Conversation Started</p>
                                        <p className="text-[#1a1a1a] font-medium">{formatDate(selectedConvo.last_message_at)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Collapsible sections */}
                            <button
                                onClick={() => setAboutOpen(!aboutOpen)}
                                className="w-full flex items-center justify-between bg-[#f9f8f5] rounded-2xl px-5 py-4 mb-3 text-sm font-semibold text-[#1a1a1a]"
                            >
                                About
                                <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center">
                                    {aboutOpen ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                                </div>
                            </button>

                            <button className="w-full flex items-center justify-between bg-[#f9f8f5] rounded-2xl px-5 py-4 text-sm font-semibold text-[#1a1a1a]">
                                Shared Files
                                <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center">
                                    <FaChevronDown className="text-[10px]" />
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
