'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { Conversation } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/constants';
import {
    FaMagnifyingGlass,
    FaChevronDown,
    FaChevronUp,
} from 'react-icons/fa6';

/* ── Mock conversation data (used when API returns empty) ── */
const MOCK_CONVERSATIONS = [
    { id: '1', name: 'Nisha Abhraham', lastMsg: 'Typing..', avatar: 'https://i.pravatar.cc/80?img=1', time: '2m ago' },
    { id: '2', name: 'Zaigam Akhtar', lastMsg: 'You: Let\'s stay in touch!', avatar: 'https://i.pravatar.cc/80?img=2', time: '1h ago' },
    { id: '3', name: 'Aditya Sharma', lastMsg: 'Meeting scheduled at..', avatar: 'https://i.pravatar.cc/80?img=3', time: '3h ago', active: true },
    { id: '4', name: 'Nisha Abhraham', lastMsg: 'Typing..', avatar: 'https://i.pravatar.cc/80?img=4', time: '5h ago' },
    { id: '5', name: 'Zaigam Akhtar', lastMsg: 'You: Let\'s stay in touch!', avatar: 'https://i.pravatar.cc/80?img=5', time: '1d ago' },
    { id: '6', name: 'Adam Hills', lastMsg: 'Meeting scheduled at..', avatar: 'https://i.pravatar.cc/80?img=6', time: '2d ago' },
];

const MOCK_MESSAGES = [
    { id: '1', sender: 'them', text: 'Hi Srishti, Hope you are doing well.' },
    { id: '2', sender: 'them', text: 'Congratulations! You have been shortlisted for the next round. We really liked your profile and would like to schedule a short meeting to get to know more about your skills and interests.' },
    { id: '3', sender: 'me', text: 'Thank you for the opportunity.\nPlease let me know a convenient time for the meeting.\nLooking forward to speaking with you.' },
    { id: '4', sender: 'me', text: 'Best regards,\nSrishti' },
    { id: '5', sender: 'them', text: 'Meeting scheduled at 7:00 PM on 18-03-26.\nKindly join the meeting at the scheduled time. Let us know if you have any questions or need to reschedule.\n\nMeeting Link: [Insert Link]' },
];

export default function MessagesPage() {
    const { user } = useAuthStore();
    const [conversations, setConversations] = useState<typeof MOCK_CONVERSATIONS>(MOCK_CONVERSATIONS);
    const [selectedId, setSelectedId] = useState('3');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);

    const selectedConvo = conversations.find((c) => c.id === selectedId) || conversations[0];

    const filteredConvos = conversations.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                                    <Image src={c.avatar} alt={c.name} width={40} height={40} className="object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-[#1a1a1a] truncate">{c.name}</p>
                                    <p className="text-xs text-slate-400 truncate">{c.lastMsg}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── CENTER: Chat Area ── */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Chat header */}
                    <div className="px-6 py-4 border-b border-[#e8e4dc] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
                            <Image src={selectedConvo.avatar} alt={selectedConvo.name} width={40} height={40} className="object-cover" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#1a1a1a]">{selectedConvo.name}</p>
                            <p className="text-xs text-slate-400">PaySphere</p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {MOCK_MESSAGES.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-2xl px-5 py-3 text-sm leading-relaxed whitespace-pre-line ${
                                        msg.sender === 'me'
                                            ? 'bg-[#f4f1ea] text-[#1a1a1a] rounded-br-md'
                                            : 'bg-lime-100 text-[#1a1a1a] rounded-bl-md'
                                    }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="px-6 py-4 border-t border-[#e8e4dc]">
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                className="flex-1 bg-[#f4f4f4] rounded-full text-sm px-5 py-3 outline-none"
                            />
                            <button className="bg-lime-400 text-black w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm hover:bg-lime-300 transition-colors shrink-0">
                                ↗
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: General Info Panel ── */}
                <div className="hidden xl:block w-[280px] shrink-0 border-l border-[#e8e4dc] overflow-y-auto">
                    <div className="p-6">
                        <h3 className="text-base font-bold text-[#1a1a1a] mb-5">General Info</h3>

                        {/* Contact card */}
                        <div className="bg-[#f9f8f5] rounded-2xl p-5 mb-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
                                    <Image src={selectedConvo.avatar} alt={selectedConvo.name} width={40} height={40} className="object-cover" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-[#1a1a1a]">{selectedConvo.name}</p>
                                    <p className="text-xs text-slate-400">PaySphere</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <p className="text-slate-400 font-medium">Email</p>
                                    <p className="text-[#1a1a1a] font-medium">talent@paysphere.com</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 font-medium">Date Created</p>
                                    <p className="text-[#1a1a1a] font-medium">Mar&apos; 17, 2026 - 12:30 PM</p>
                                </div>
                            </div>
                        </div>

                        {/* Collapsible sections */}
                        <button
                            onClick={() => setAboutOpen(!aboutOpen)}
                            className="w-full flex items-center justify-between bg-[#f9f8f5] rounded-2xl px-5 py-4 mb-3 text-sm font-semibold text-[#1a1a1a]"
                        >
                            About Company
                            <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center">
                                {aboutOpen ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                            </div>
                        </button>

                        <button className="w-full flex items-center justify-between bg-[#f9f8f5] rounded-2xl px-5 py-4 mb-3 text-sm font-semibold text-[#1a1a1a]">
                            Shared Files
                            <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center">
                                <FaChevronDown className="text-[10px]" />
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
            </div>
        </div>
    );
}
