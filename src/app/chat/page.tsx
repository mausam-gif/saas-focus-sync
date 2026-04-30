"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Send, Paperclip, Loader2, MessageCircle, Shield, Crown, 
    User as UserIcon, Image as ImageIcon, Mic, MicOff, 
    MoreVertical, Edit2, Trash2, X, Settings, Calendar,
    UserPlus, Users, MessageSquare, ChevronRight, Search,
    ChevronLeft
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api, API_BASE_URL } from '@/lib/api';

interface ChatMsg {
    id: number;
    user_id: number;
    user_name: string;
    user_role: string;
    recipient_id: number | null;
    recipient_name: string | null;
    message: string | null;
    attachment_url: string | null;
    attachment_type: string | null;
    is_edited: boolean;
    edited_at: string | null;
    is_deleted: boolean;
    is_read: boolean;
    timestamp: string;
}

interface ChatUser {
    id: number;
    name: string;
    role: string;
    designation: string;
}

interface InboxItem {
    user_id: number;
    user_name: string;
    user_role: string;
    last_message: string;
    timestamp: string;
    has_unread: boolean;
    unread_count: number;
}

export default function ChatPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    
    // UI State
    const [view, setView] = useState<'group' | 'dm'>('group');
    const [activeDmUser, setActiveDmUser] = useState<ChatUser | null>(null);
    const [mobileActivePage, setMobileActivePage] = useState<'list' | 'chat'>('list');
    
    // Data State
    const [inbox, setInbox] = useState<InboxItem[]>([]);
    const [groupUnread, setGroupUnread] = useState(false);
    const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [newMsg, setNewMsg] = useState('');
    
    // Action State
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    
    // Mention State
    const [mentionSearch, setMentionSearch] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [mentionIndex, setMentionIndex] = useState(0);
    
    // Edit State
    const [editingMsg, setEditingMsg] = useState<ChatMsg | null>(null);
    const [editValue, setEditValue] = useState('');
    
    // Admin Clear State
    const [showClearModal, setShowClearModal] = useState(false);
    const [clearScope, setClearScope] = useState<'group' | 'dm_all' | 'dm_user'>('group');
    const [clearDate, setClearDate] = useState('');
    
    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const fetchMessages = useCallback(async () => {
        try {
            let endpoint = view === 'group' ? '/chat/' : `/chat/dm/${activeDmUser?.id}`;
            if (view === 'dm' && !activeDmUser) return;
            
            const res = await api.get(endpoint);
            setMessages(res.data);
        } catch (err) {
            console.error("Failed to load messages", err);
        }
    }, [view, activeDmUser]);

    const fetchInbox = useCallback(async () => {
        try {
            const res = await api.get('chat/inbox');
            setInbox(res.data.dms);
            setGroupUnread(res.data.group_unread);

            // Update Cache
            if (user) {
                const cacheKey = `chat_data_${user.id}`;
                const existing = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    ...existing,
                    inbox: res.data.dms,
                    group_unread: res.data.group_unread,
                    timestamp: Date.now()
                }));
            }
        } catch (err) {
            console.error("Failed to load inbox", err);
        }
    }, [user]);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await api.get('chat/users');
            setAllUsers(res.data);

            // Update Cache
            if (user) {
                const cacheKey = `chat_data_${user.id}`;
                const existing = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    ...existing,
                    allUsers: res.data,
                    timestamp: Date.now()
                }));
            }
        } catch (err) {
            console.error("Failed to load users", err);
        }
    }, [user]);

    const markAsRead = useCallback(async (contactId?: number) => {
        try {
            await api.put('chat/read', null, { params: { contact_id: contactId } });
            fetchInbox();
        } catch (err) {
            console.error("Failed to mark as read", err);
        }
    }, [fetchInbox]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user) {
            // 1. Instant Load from Cache (SWR Pattern)
            const cacheKey = `chat_data_${user.id}`;
            const cachedData = sessionStorage.getItem(cacheKey);
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    if (parsed.inbox) setInbox(parsed.inbox);
                    if (parsed.allUsers) setAllUsers(parsed.allUsers);
                    if (parsed.groupUnread !== undefined) setGroupUnread(parsed.groupUnread);
                } catch (e) {
                    console.error("Cache parse error", e);
                }
            }

            fetchInbox();
            fetchUsers();
            const interval = setInterval(() => {
                fetchInbox();
            }, 8000); // Polling inbox less frequently
            return () => clearInterval(interval);
        }
    }, [user, authLoading, router, fetchInbox, fetchUsers]);


    // Dedicated effect for fetching messages on state change or polling
    useEffect(() => {
        if (user) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [user, fetchMessages]);

    // Handle switching between chats: reset input and mark as read
    useEffect(() => {
        if (user) {
            setNewMsg('');
            setAttachment(null);
            setEditingMsg(null);
            if (view === 'group') {
                markAsRead();
            } else if (activeDmUser) {
                markAsRead(activeDmUser.id);
            }
        }
    }, [view, activeDmUser, user, markAsRead]);

    // Mark as read when new messages arrive while chat is open
    useEffect(() => {
        if (messages.length > 0 && messages[messages.length - 1].user_id !== user?.id) {
            if (view === 'group' && groupUnread) markAsRead();
            if (view === 'dm' && activeDmUser) {
                const hasUnread = messages.some(m => m.user_id === activeDmUser.id && !m.is_read);
                if (hasUnread) markAsRead(activeDmUser.id);
            }
        }
    }, [messages, view, activeDmUser, user, groupUnread, markAsRead]);

    useEffect(() => {
        if (isAtBottom) scrollToBottom();
    }, [messages, isAtBottom, scrollToBottom]);

    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        setIsAtBottom(scrollHeight - scrollTop - clientHeight < 100);
    };

    // --- Sending Logic ---
    const handleSend = async () => {
        if (!newMsg.trim() && !attachment) return;
        setIsSending(true);
        try {
            let attachmentUrl = null;
            let attachmentType = null;

            if (attachment) {
                setIsUploading(true);
                const formData = new FormData();
                formData.append('file', attachment);
                const uploadRes = await api.post('upload/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                attachmentUrl = uploadRes.data.url;
                attachmentType = uploadRes.data.type;
                setIsUploading(false);
            }

            await api.post('chat/', {
                message: newMsg.trim() || null,
                attachment_url: attachmentUrl,
                attachment_type: attachmentType,
                recipient_id: view === 'dm' ? activeDmUser?.id : null
            });
            setNewMsg('');
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            await fetchMessages();
            await fetchInbox();
            setIsAtBottom(true);
        } catch (err: any) {
            alert('Failed to send: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsSending(false);
            setIsUploading(false);
        }
    };

    // --- Voice Recording ---
    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorder?.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream);
                const chunks: Blob[] = [];
                recorder.ondataavailable = (e) => chunks.push(e.data);
                recorder.onstop = async () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    const file = new File([blob], "voice_message.webm", { type: 'audio/webm' });
                    setAttachment(file);
                    stream.getTracks().forEach(track => track.stop());
                };
                recorder.start();
                setMediaRecorder(recorder);
                setIsRecording(true);
            } catch (err) {
                alert("Could not access microphone");
            }
        }
    };

    // --- Mentions ---
    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewMsg(val);
        
        const lastAtChar = val.lastIndexOf('@');
        if (lastAtChar !== -1 && (lastAtChar === 0 || val[lastAtChar - 1] === ' ')) {
            const query = val.slice(lastAtChar + 1);
            setMentionSearch(query);
            setShowMentions(true);
            setMentionIndex(0);
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = (targetUser: ChatUser) => {
        const lastAtChar = newMsg.lastIndexOf('@');
        const prefix = newMsg.slice(0, lastAtChar);
        setNewMsg(prefix + `@${targetUser.name} `);
        setShowMentions(false);
    };

    const filteredMentionUsers = allUsers.filter(u => 
        u.name.toLowerCase().includes(mentionSearch.toLowerCase())
    ).slice(0, 5);

    // --- Edit / Unsend ---
    const handleEdit = async () => {
        if (!editingMsg || !editValue.trim()) return;
        try {
            await api.put(`chat/${editingMsg.id}`, { message: editValue });
            setEditingMsg(null);
            fetchMessages();
        } catch (err) { alert("Failed to edit message"); }
    };

    const handleUnsend = async (id: number) => {
        if (!confirm("Unsend this message?")) return;
        try {
            await api.delete(`chat/${id}`);
            fetchMessages();
        } catch (err) { alert("Failed to unsend"); }
    };

    // --- Admin Clear ---
    const handleClear = async () => {
        try {
            const params: any = { scope: clearScope };
            if (clearDate) params.before_date = new Date(clearDate).toISOString();
            if (clearScope === 'dm_user' && activeDmUser) params.target_user_id = activeDmUser.id;
            
            const res = await api.delete('chat/admin/clear', { params });
            alert(`Deleted ${res.data.deleted_count} messages`);
            setShowClearModal(false);
            fetchMessages();
        } catch (err) { alert("Failed to clear messages"); }
    };

    // --- UI Helpers ---
    const getRoleBadge = (role: string) => {
        const roles: any = {
            ADMIN: { label: 'Elite', color: 'bg-indigo-50 text-indigo-700', icon: Shield },
            MANAGER: { label: 'Manager', color: 'bg-amber-50 text-amber-700', icon: Crown },
            EMPLOYEE: { label: 'Member', color: 'bg-emerald-50 text-emerald-700', icon: UserIcon }
        };
        const r = roles[role] || roles.EMPLOYEE;
        return (
            <span className={`inline-flex items-center space-x-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${r.color}`}>
                <r.icon className="w-2.5 h-2.5" />
                <span>{r.label}</span>
            </span>
        );
    };

    const formatTime = (ts: string) => {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (authLoading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;

    return (
        <div className="flex h-[calc(100vh-2rem)] max-w-7xl mx-auto p-0 sm:p-4 gap-4 overflow-hidden bg-gray-50/50">
            
            {/* --- LEFT SIDEBAR (Inbox / Navigation) --- */}
            <div className={`
                ${mobileActivePage === 'list' ? 'flex' : 'hidden'} md:flex
                w-full md:w-80 lg:w-96 flex flex-col bg-white md:rounded-3xl border-r md:border border-gray-100 shadow-sm overflow-hidden z-20
            `}>
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Messages</h2>
                    <div className="flex items-center gap-2">
                         {user?.role === 'ADMIN' && (
                            <button onClick={() => setShowClearModal(true)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-xl transition-all">
                                <Settings className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {/* Search Placeholder */}
                    <div className="px-3 mb-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Search team..." className="w-full bg-gray-100/50 border-none rounded-xl py-2 pl-9 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder-gray-400 font-medium" />
                        </div>
                    </div>

                    {/* Group Chat Nav */}
                    <button 
                        onClick={() => { setView('group'); setActiveDmUser(null); setMobileActivePage('chat'); }}
                        className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all relative ${view === 'group' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50'}`}
                    >
                        <div className={`p-2 rounded-xl ${view === 'group' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="text-left flex-1">
                            <p className={`text-sm font-bold ${view === 'group' ? 'text-white' : 'text-gray-900'} ${groupUnread && view !== 'group' ? 'font-bold' : 'font-semibold'}`}>General Team</p>
                            <p className={`text-[11px] font-medium ${view === 'group' ? 'text-indigo-100' : 'text-gray-500'}`}>Official dashboard</p>
                        </div>
                        {groupUnread && view !== 'group' && (
                            <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white"></div>
                        )}
                    </button>

                    <div className="px-4 py-3 mt-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inbox</p>
                    </div>

                    {/* DM Inbox Items */}
                    <div className="space-y-1">
                        {inbox.map(item => (
                            <button 
                                key={item.user_id}
                                onClick={() => { 
                                    setView('dm'); 
                                    setActiveDmUser({ id: item.user_id, name: item.user_name, role: item.user_role } as any); 
                                    setMobileActivePage('chat');
                                }}
                                className={`w-full flex items-center space-x-3 p-3 rounded-2xl transition-all group relative ${view === 'dm' && activeDmUser?.id === item.user_id ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                            >
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-lg relative">
                                    {item.user_name.charAt(0).toUpperCase()}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="text-left flex-1 min-w-0 pr-4">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <p className={`text-sm tracking-tight truncate ${item.has_unread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                                            {item.user_name}
                                        </p>
                                        <span className={`text-[10px] ${item.has_unread ? 'font-bold text-blue-600' : 'font-medium text-gray-400'}`}>
                                            {formatTime(item.timestamp)}
                                        </span>
                                    </div>
                                    <p className={`text-[12px] truncate ${item.has_unread ? 'font-bold text-gray-900' : 'font-medium text-gray-500'}`}>
                                        {item.last_message || "Shared a file"}
                                    </p>
                                </div>
                                {item.has_unread && (
                                    <div className="absolute top-1/2 -translate-y-1/2 right-4 w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="px-4 py-3 mt-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Team</p>
                    </div>

                    {/* All Users for New DMs */}
                    <div className="space-y-0.5">
                        {allUsers.filter(u => !inbox.find(i => i.user_id === u.id)).map(u => (
                            <button 
                                key={u.id}
                                onClick={() => { setView('dm'); setActiveDmUser(u); setMobileActivePage('chat'); }}
                                className="w-full flex items-center space-x-3 p-3 rounded-2xl hover:bg-gray-50 transition-all opacity-80 hover:opacity-100"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center font-bold text-gray-400">
                                    {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                                    <p className="text-[10px] text-gray-500 font-medium uppercase">{u.designation || u.role}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- MAIN CHAT AREA --- */}
            <div className={`
                ${mobileActivePage === 'chat' ? 'flex' : 'hidden'} md:flex
                flex-1 flex flex-col bg-white md:rounded-3xl md:border border-gray-100 shadow-sm overflow-hidden relative z-10
            `}>
                
                {/* Chat Header */}
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-50 flex items-center justify-between bg-white/90 backdrop-blur-md z-30 sticky top-0">
                    <div className="flex items-center space-x-3">
                        {/* Mobile Back Button */}
                        <button 
                            onClick={() => setMobileActivePage('list')}
                            className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>

                        <div className={`p-2.5 rounded-xl hidden sm:flex ${view === 'group' ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>
                            {view === 'group' ? <Users className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                        </div>
                        <div>
                            <h1 className="text-base md:text-lg font-bold text-gray-900 leading-tight">
                                {view === 'group' ? "Team Chat" : activeDmUser?.name}
                            </h1>
                            <div className="flex items-center space-x-2 mt-0.5">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {view === 'group' ? `${messages.length} messages` : activeDmUser?.role || 'Elite'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messages Container */}
                <div 
                    ref={chatContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 md:p-6 space-y-1 custom-scrollbar bg-gray-50/20"
                >
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center px-6 opacity-60">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Quiet in here...</h3>
                            <p className="text-xs text-gray-400 mt-1 font-medium">Messages are synced across all your devices.</p>
                        </div>
                    )}

                    {messages.map((m, idx) => {
                        const isMe = m.user_id === user?.id;
                        const prevMsg = messages[idx-1];
                        const nextMsg = messages[idx+1];

                        const isFirstInSequence = !prevMsg || prevMsg.user_id !== m.user_id || (new Date(m.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() > 300000);
                        const isLastInSequence = !nextMsg || nextMsg.user_id !== m.user_id || (new Date(nextMsg.timestamp).getTime() - new Date(m.timestamp).getTime() > 300000);

                        return (
                            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isLastInSequence ? 'mb-4' : 'mb-0.5'}`}>
                                {isFirstInSequence && (
                                    <div className={`flex items-center space-x-2 mt-4 mb-2 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                        <span className="text-[11px] font-bold text-gray-900">{isMe ? 'You' : m.user_name}</span>
                                        {getRoleBadge(m.user_role)}
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                            {formatTime(m.timestamp)}
                                        </span>
                                    </div>
                                )}
                                
                                <div className={`relative max-w-[85%] sm:max-w-[70%] flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 group`}>
                                    <div className={`
                                        px-4 py-2.5 shadow-sm
                                        ${isMe 
                                            ? m.is_deleted ? 'bg-gray-100 text-gray-400 border border-gray-200' : 'bg-indigo-600 text-white shadow-indigo-100' 
                                            : m.is_deleted ? 'bg-gray-50 text-gray-400 border border-gray-100' : 'bg-white text-gray-800 border border-gray-50'
                                        }
                                        rounded-[1.25rem]
                                        ${isMe ? 
                                            (isFirstInSequence ? 'rounded-tr-sm' : isLastInSequence ? 'rounded-br-sm' : 'rounded-r-sm') : 
                                            (isFirstInSequence ? 'rounded-tl-sm' : isLastInSequence ? 'rounded-bl-sm' : 'rounded-l-sm')
                                        }
                                    `}>
                                        {m.is_deleted ? (
                                            <p className="text-xs italic">Message unsent</p>
                                        ) : (
                                            <>
                                                {m.message && <p className="text-sm md:text-[14.5px] whitespace-pre-wrap font-medium leading-[1.6]">
                                                    {m.message.split(/(@\w+)/).map((part, i) => 
                                                        part.startsWith('@') ? <span key={i} className="font-bold underline decoration-2 underline-offset-2">_{part.slice(1)}_</span> : part
                                                    )}
                                                </p>}
                                                
                                                {m.attachment_url && (
                                                    <div className="mt-2 overflow-hidden rounded-xl">
                                                        {m.attachment_type === 'audio' ? (
                                                            <div className={`p-2 rounded-xl flex items-center gap-3 ${isMe ? 'bg-white/10' : 'bg-gray-100/50'}`}>
                                                                <button className={`p-2 rounded-full ${isMe ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}><Mic className="w-4 h-4" /></button>
                                                                <audio controls src={`${API_BASE_URL}${m.attachment_url}`} className="h-8 max-w-[140px] md:max-w-[180px]" />
                                                            </div>
                                                        ) : m.attachment_type === 'image' ? (
                                                            <img src={`${API_BASE_URL}${m.attachment_url}`} alt="shared" className="max-h-80 w-full object-cover hover:opacity-90 transition-opacity cursor-pointer" />
                                                        ) : (
                                                            <a href={`${API_BASE_URL}${m.attachment_url}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 text-xs font-bold rounded-xl ${isMe ? 'bg-white/10 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                                                                <Paperclip className="w-4 h-4" /> View File
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {!m.is_deleted && m.is_edited && (
                                            <span className={`block text-[9px] mt-1 font-bold uppercase opacity-50 text-right`}>Edited</span>
                                        )}
                                    </div>

                                    {/* Action Buttons (Hover) */}
                                    {isMe && !m.is_deleted && (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                                            <button onClick={() => { setEditingMsg(m); setEditValue(m.message || ''); }} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleUnsend(m.id)} className="p-2 hover:bg-red-50 rounded-full text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Mention Dropdown */}
                {showMentions && filteredMentionUsers.length > 0 && (
                    <div className="absolute bottom-20 left-4 right-4 md:left-6 md:right-auto z-50 bg-white border border-gray-100 shadow-xl rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Member</p>
                        </div>
                        {filteredMentionUsers.map((u, i) => (
                            <button 
                                key={u.id}
                                onClick={() => insertMention(u)}
                                className={`w-full text-left px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors ${mentionIndex === i ? 'bg-gray-50' : ''}`}
                            >
                                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                    {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-900">{u.name}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{u.role}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* INPUT AREA */}
                <div className="p-4 md:p-6 bg-white border-t border-gray-50 relative pb-safe">
                    {/* Previews */}
                    {attachment && (
                        <div className="absolute -top-14 left-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-xl flex items-center justify-between shadow-xl animate-in slide-in-from-bottom-2">
                             <div className="flex items-center gap-2 overflow-hidden">
                                <ImageIcon className="w-4 h-4" />
                                <span className="text-xs font-bold truncate">{attachment.name}</span>
                             </div>
                             <button onClick={() => setAttachment(null)} className="p-1 hover:bg-white/20 rounded-full">
                                <X className="w-4 h-4" />
                             </button>
                        </div>
                    )}
                    {editingMsg && (
                        <div className="absolute -top-14 left-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-xl flex items-center justify-between shadow-xl">
                             <div className="flex items-center gap-2 overflow-hidden">
                                <Edit2 className="w-4 h-4" />
                                <span className="text-xs font-bold truncate">Editing message...</span>
                             </div>
                             <button onClick={() => setEditingMsg(null)} className="p-1 hover:bg-white/20 rounded-full">
                                <X className="w-4 h-4" />
                             </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 md:gap-4 bg-gray-100 rounded-[1.75rem] px-2 py-2 border border-gray-100">
                        <input 
                            ref={fileInputRef} type="file" className="hidden" 
                            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt"
                            onChange={e => setAttachment(e.target.files?.[0] || null)}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-full transition-all"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>

                        <button 
                            onClick={toggleRecording}
                            className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-red-200' : 'text-gray-400 hover:text-indigo-600 hover:bg-white'}`}
                        >
                            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>

                        <input 
                            type="text"
                            value={editingMsg ? editValue : newMsg}
                            onChange={(e) => editingMsg ? setEditValue(e.target.value) : handleTextChange(e)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (editingMsg) handleEdit(); else handleSend();
                                }
                                if (showMentions && filteredMentionUsers.length > 0) {
                                    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(p => (p + 1) % filteredMentionUsers.length); }
                                    if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(p => (p - 1 + filteredMentionUsers.length) % filteredMentionUsers.length); }
                                    if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); insertMention(filteredMentionUsers[mentionIndex]); }
                                }
                            }}
                            placeholder={editingMsg ? "Fix your message..." : "Type a message..."}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-[14.5px] font-semibold text-gray-900 placeholder-gray-400 outline-none px-2"
                        />

                        <button 
                            onClick={editingMsg ? handleEdit : handleSend}
                            disabled={isSending || isUploading || (!newMsg.trim() && !attachment && !editValue.trim())}
                            className={`p-3.5 rounded-full transition-all shadow-lg ${isRecording ? 'bg-gray-200 text-gray-400 shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}
                        >
                            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Admin Clear Modal */}
            {showClearModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-10 pb-6 text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Trash2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 leading-none tracking-tight">System Purge</h2>
                            <p className="text-xs text-gray-400 mt-4 font-bold uppercase tracking-[0.2em]">Authorized Management Only</p>
                        </div>
                        
                        <div className="px-10 py-6 space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Scope</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'group', label: 'All Group Chat', icon: Users },
                                        { id: 'dm_all', label: 'All Private Chats', icon: Shield },
                                        { id: 'dm_user', label: `${activeDmUser?.name || 'Target'} Only`, icon: UserIcon }
                                    ].map(opt => (
                                        <button 
                                            key={opt.id}
                                            onClick={() => setClearScope(opt.id as any)}
                                            className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${clearScope === opt.id ? 'border-indigo-600 bg-indigo-50/30 text-indigo-700' : 'border-gray-50 hover:bg-gray-50 text-gray-600'}`}
                                        >
                                            <opt.icon className="w-5 h-5" />
                                            <span className="font-bold text-sm tracking-tight">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Clear Before</label>
                                <div className="relative">
                                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                    <input 
                                        type="date" 
                                        value={clearDate}
                                        onChange={(e) => setClearDate(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:border-indigo-600 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-gray-50 flex gap-4">
                            <button onClick={() => setShowClearModal(false)} className="flex-1 py-4.5 bg-white text-gray-400 font-bold rounded-2xl hover:bg-gray-100 transition-colors uppercase text-[10px] tracking-widest">Cancel</button>
                            <button onClick={handleClear} className="flex-1 py-4.5 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200 uppercase text-[10px] tracking-widest">Execute Purge</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
