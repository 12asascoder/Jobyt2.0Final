'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { FaMagnifyingGlass, FaChevronDown } from 'react-icons/fa6';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/auth.store';

interface User {
  id: string;
  name: string;
  email: string;
}

interface ConversationDetail {
  id: string;
  recruiter_id: string;
  applicant_id: string;
  job_id: string | null;
  recruiter?: User;
  applicant?: User;
  last_message_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface SendMessageData {
  message?: Message;
}

interface Conversation {
  id: string;
  recruiter_id: string;
  applicant_id: string;
  job_id: string | null;
  last_message_at: string;
  last_message?: string;
  participant?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    logo_url?: string | null;
  };
  unread?: boolean;
}

interface PublicUserProfile {
  id: string;
  email?: string;
  role?: string;
  profile?: {
    name?: string | null;
    companyName?: string | null;
    photo_url?: string | null;
    logo_url?: string | null;
  };
}

const getInitials = (name: string): string => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
};

const formatTime = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

const toTime = (value?: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get('conversationId');
  const { user } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get<any>('/messages/conversations');
      const rawConversations = Array.isArray(res.data?.conversations) ? res.data.conversations : Array.isArray(res.data) ? res.data : [];
      
      const participantIds = [...new Set(rawConversations.map((conv: Conversation) => conv.applicant_id).filter((id: string | undefined) => Boolean(id)))] as string[];

      const profileEntries = await Promise.all(
        participantIds.map(async (id) => {
          try {
            const profileRes = await api.get<PublicUserProfile>(`/users/${id}`);
            return [id, profileRes.data] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );

      const profileMap = new Map(profileEntries);

      const enrichedConversations = rawConversations.map((conv: Conversation) => {
        const profile = profileMap.get(conv.applicant_id);
        const participantName = profile?.profile?.name || profile?.profile?.companyName || null;
        return {
          ...conv,
          participant: {
            id: conv.applicant_id,
            name: participantName,
            email: profile?.email || null,
            avatar: profile?.profile?.photo_url || null,
            logo_url: profile?.profile?.logo_url || null,
          },
        };
      });

      setConversations(enrichedConversations);
    } catch (err) {
      toast.error('Failed to load conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    setMessagesLoading(true);
    try {

      const msgRes = await api.get<any>(`/messages/conversations/${conversationId}?page=1&limit=50`);

      const selectedMeta = conversations.find((conv) => conv.id === conversationId);
      setSelectedConversation(
        selectedMeta
          ? {
              id: selectedMeta.id,
              recruiter_id: selectedMeta.recruiter_id,
              applicant_id: selectedMeta.applicant_id,
              job_id: selectedMeta.job_id,
              last_message_at: selectedMeta.last_message_at,
            }
          : null,
      );

      let msgs = msgRes.data?.messages || msgRes.data || [];
      if (!Array.isArray(msgs)) msgs = [];
      const sortedMsgs = msgs.sort((a: Message, b: Message) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(sortedMsgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      toast.error('Failed to load messages');
      setSelectedConversation(null);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [conversations, user?.id]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConvId) return;
    setSendingMessage(true);
    try {

      const response = await api.post<SendMessageData>(`/messages/conversations/${selectedConvId}`, {
        content: newMessage,
      });
      const createdMessage = response.data?.message;
      if (createdMessage) {
        setMessages((prev) => [...prev, createdMessage]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
      setNewMessage('');
      void fetchConversations();
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  }, [newMessage, selectedConvId, fetchConversations]);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedConvId(initialConversationId);
      return;
    }
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    if (!selectedConvId && conversations.length > 0) {
      const firstValidConversation = conversations.find((conv) => Boolean(conv.participant?.name?.trim() || conv.participant?.email?.trim()));
      if (firstValidConversation) setSelectedConvId(firstValidConversation.id);
    }
  }, [initialConversationId, selectedConvId, conversations]);

  useEffect(() => {
    if (selectedConvId) void fetchMessages(selectedConvId);
  }, [selectedConvId, fetchMessages]);

  const sortedConversations = useMemo(() => {
    return [...conversations]
      .sort((a, b) => toTime(b.last_message_at) - toTime(a.last_message_at))
      .filter((conv) =>
        (!searchQuery ||
          (conv.participant?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (conv.participant?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (conv.last_message || '').toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }, [conversations, searchQuery]);

  const selectedConversationItem = useMemo(
    () => conversations.find((conv) => conv.id === selectedConvId) || null,
    [conversations, selectedConvId],
  );

  const selectedParticipant = selectedConversationItem?.participant;

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] overflow-hidden">
      {/* Main Container */}
      <div 
        className="w-full max-w-[1208px] h-full max-h-[731px] bg-[#F4F1EA] rounded-[32px] flex flex-col md:flex-row overflow-hidden p-4 md:p-6 gap-4 md:gap-6 shadow-sm"
      >
        
        {/* LEFT PANEL - Chat List: full on mobile when no convo, hidden on mobile when convo selected */}
        <div className={`${selectedConvId ? 'hidden md:flex' : 'flex'} w-full md:w-[300px] lg:w-[340px] flex-col gap-4 flex-shrink-0`}>
          {/* Search Bar */}
          <div className="relative">
            <FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70" size={16} />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 rounded-[20px] bg-black text-white text-[15px] placeholder-white/50 focus:outline-none"
            />
          </div>

          {/* Chat List with Custom Scrollbar */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-[#F4F1EA]">
            {sortedConversations.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">Inbox is empty</div>
            ) : (
              sortedConversations.map((conv) => {
                const participant = conv.participant;
                const isSelected = conv.id === selectedConvId;
                const avatarUrl = participant?.avatar || participant?.logo_url || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + participant?.name;

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      router.replace(`${ROUTES.recruiterMessages}?conversationId=${conv.id}`);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-[20px] cursor-pointer transition-all ${
                      isSelected ? 'bg-white border-[1.5px] border-[#C3FF3D] shadow-sm' : 'bg-white/60 hover:bg-white border-[1.5px] border-transparent'
                    }`}
                  >
                    <div className="w-[46px] h-[46px] rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                      <img src={resolveAssetUrl(avatarUrl) || undefined} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-black truncate leading-tight">
                        {participant?.name || participant?.email || 'User'}
                      </p>
                      <p className="text-[13px] text-slate-500 truncate leading-tight mt-0.5">
                        {conv.last_message ? (msg => msg.length > 25 ? msg.substring(0,25) + '..' : msg)(conv.last_message) : 'No messages'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MIDDLE PANEL - Chat Area: full on mobile when convo selected, hidden on mobile when no convo */}
        <div className={`${selectedConvId ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full bg-transparent min-w-0`}>
          {selectedConvId ? (
            <>
              {/* Chat Header with back button on mobile */}
              <div className="bg-white rounded-[20px] px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4 flex-shrink-0 shadow-sm mb-4">
                <button
                  className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-black text-white shrink-0"
                  onClick={() => setSelectedConvId(null)}
                  aria-label="Back to conversations"
                >
                  &#8592;
                </button>
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                  <img src={resolveAssetUrl(selectedParticipant?.avatar || selectedParticipant?.logo_url || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + selectedParticipant?.name) || undefined} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-black leading-tight">
                    {selectedParticipant?.name || selectedParticipant?.email || 'User'}
                  </h3>
                  <p className="text-[12px] text-slate-500 leading-tight">Applicant</p>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                {messagesLoading ? (
                  <div className="flex justify-center items-center h-full"><Spinner /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm mt-12">No messages yet. Say hi!</div>
                ) : (
                  messages.map((msg) => {
                    const isOwnMessage = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <div className="flex flex-col max-w-[80%]">
                          <div
                            className={`px-5 py-3 rounded-[16px] ${
                              isOwnMessage
                                ? 'bg-[#E4F9A0] text-black rounded-tr-sm'
                                : 'bg-[#F4F4F4] text-black rounded-tl-sm'
                            }`}
                          >
                            <p className="text-[14px] leading-[1.5] break-words">{msg.body}</p>
                          </div>
                          <span className={`text-[11px] text-slate-400 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-white rounded-[20px] p-3 flex gap-3 flex-shrink-0 shadow-sm items-center">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                  disabled={sendingMessage}
                  className="flex-1 px-4 py-2 bg-transparent text-[14px] text-black placeholder-slate-400 focus:outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="px-6 py-2.5 rounded-full bg-black text-white text-[14px] font-bold hover:bg-slate-900 transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 bg-white/50 rounded-[24px] flex items-center justify-center">
              <p className="text-slate-400 font-medium">Select a conversation to start messaging</p>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - General Info: hidden on mobile and tablet */}
        <div className="hidden lg:flex w-[280px] flex-col gap-4 flex-shrink-0">
          <h4 className="text-[18px] font-bold text-black px-2 mt-2">General Info</h4>
          
          <div className="bg-white rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                <img src={resolveAssetUrl(selectedParticipant?.avatar || selectedParticipant?.logo_url || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + selectedParticipant?.name) || undefined} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-black leading-tight">
                  {selectedParticipant?.name || 'User'}
                </p>
                <p className="text-[12px] text-slate-500 leading-tight mt-0.5">Applicant</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">Email</p>
                <p className="text-[12px] text-black font-medium">{selectedParticipant?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">Date Created</p>
                <p className="text-[12px] text-black font-medium">
                  {formatDateTime(selectedConversationItem?.last_message_at || selectedConversation?.last_message_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-slate-50">
            <span className="text-[14px] font-bold text-black">Shared Files</span>
            <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-white">
              <FaChevronDown size={10} />
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-slate-50">
            <span className="text-[14px] font-bold text-black">Shared Links</span>
            <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-white">
              <FaChevronDown size={10} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
