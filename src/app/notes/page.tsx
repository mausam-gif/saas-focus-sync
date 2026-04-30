"use client";
import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    StickyNote, 
    Search, 
    Trash2, 
    Edit2, 
    Clock, 
    Calendar,
    ChevronDown,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function NotesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [notes, setNotes] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [projects, setProjects] = useState<any[]>([]);

    const [noteForm, setNoteForm] = useState({
        title: '',
        content: '',
        is_reminder: false,
        reminder_date: '',
        project_id: ''
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (authLoading || !user) return;

        // 1. Instant Load from Cache (SWR Pattern)
        const cacheKey = `notes_data_${user.id}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                if (parsed.notes) setNotes(parsed.notes);
                if (parsed.projects) setProjects(parsed.projects);
                setIsLoading(false); // Immediate transition to content
            } catch (e) {
                console.error("Cache parse error", e);
            }
        }

        fetchInitialData();
    }, [user, authLoading, router]);

    const fetchInitialData = async () => {
        if (!user) return;
        try {
            const [notesRes, projRes] = await Promise.all([
                api.get('notes/'),
                api.get('projects/')
            ]);
            setNotes(notesRes.data);
            setProjects(projRes.data);

            // Update Cache
            const cacheKey = `notes_data_${user.id}`;
            sessionStorage.setItem(cacheKey, JSON.stringify({
                notes: notesRes.data,
                projects: projRes.data,
                timestamp: Date.now()
            }));
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...noteForm,
                project_id: noteForm.project_id ? parseInt(noteForm.project_id) : null,
                reminder_date: noteForm.reminder_date ? new Date(noteForm.reminder_date).toISOString() : null
            };

            if (isEditing) {
                await api.put(`notes/${isEditing}`, payload);
            } else {
                await api.post('notes/', payload);
            }
            setIsAddModalOpen(false);
            setIsEditing(null);
            setNoteForm({ title: '', content: '', is_reminder: false, reminder_date: '', project_id: '' });
            fetchNotes();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this note?')) return;
        try {
            await api.delete(`notes/${id}`);
            fetchNotes();
        } catch (err) {
            console.error(err);
        }
    };

    const filteredNotes = notes.filter(n => 
        n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        n.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading || !user) return null;

    return (
        <div className="p-4 sm:p-8 font-sans max-w-7xl mx-auto space-y-6 sm:space-y-8">
            {/* Header section modern */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Brain Dump</h1>
                    <p className="text-sm text-gray-500 mt-1">Keep track of ideas, reminders, and project notes.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-auto flex-1 sm:flex-none">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search your notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-full text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full sm:w-64 transition-all placeholder-gray-600 text-black font-medium"
                        />
                    </div>
                    <button
                        onClick={() => { setIsAddModalOpen(true); setIsEditing(null); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full sm:rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 shadow-sm whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Note</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[calc(100vh-250px)]">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredNotes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredNotes.map((note) => (
                            <div key={note.id} className="group bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                        <StickyNote className="w-5 h-5" />
                                    </div>
                                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => {
                                                setIsEditing(note.id);
                                                setNoteForm({
                                                    title: note.title || '',
                                                    content: note.content,
                                                    is_reminder: note.is_reminder,
                                                    reminder_date: note.reminder_date ? note.reminder_date.split('T')[0] : '',
                                                    project_id: note.project_id ? note.project_id.toString() : ''
                                                });
                                                setIsAddModalOpen(true);
                                            }}
                                            className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-indigo-600 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(note.id)}
                                            className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 text-lg mb-2 truncate">{note.title || 'Untitled Note'}</h3>
                                    <p className="text-sm text-gray-600 line-clamp-5 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                                </div>
                                
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-6">
                                    <div className="flex items-center space-x-2 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{format(new Date(note.created_at), 'MMM dd, yyyy')}</span>
                                    </div>
                                    {note.is_reminder && (
                                        <div className="flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                            <AlertCircle className="w-3 h-3" />
                                            <span>Reminder</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-gray-200 rounded-3xl">
                        <div className="p-5 bg-gray-50 rounded-full mb-4">
                            <StickyNote className="w-10 h-10 text-gray-300" />
                        </div>
                        <p className="text-gray-900 font-semibold text-lg">No notes yet</p>
                        <p className="text-gray-500 text-sm mb-6">Capture your thoughts or link them to specific projects.</p>
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                        >
                            Create your first note
                        </button>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Note' : 'New Brain Dump'}</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Note Title</label>
                                <input 
                                    value={noteForm.title}
                                    onChange={e => setNoteForm({...noteForm, title: e.target.value})}
                                    placeholder="Give your thought a name..."
                                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-500 text-black font-medium transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Content</label>
                                <textarea 
                                    required
                                    value={noteForm.content}
                                    onChange={e => setNoteForm({...noteForm, content: e.target.value})}
                                    placeholder="Write your heart out..."
                                    rows={6}
                                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-gray-500 text-black font-medium transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Linked Project</label>
                                    <select 
                                        value={noteForm.project_id}
                                        onChange={e => setNoteForm({...noteForm, project_id: e.target.value})}
                                        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black font-medium"
                                    >
                                        <option value="">Personal / General</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center space-x-3 cursor-pointer group bg-gray-50 p-3 rounded-xl border border-gray-100 w-full hover:bg-gray-100 transition-colors">
                                        <div 
                                            onClick={() => setNoteForm({...noteForm, is_reminder: !noteForm.is_reminder})}
                                            className={`w-6 h-6 rounded-lg border ${noteForm.is_reminder ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'} flex items-center justify-center transition-all`}
                                        >
                                            {noteForm.is_reminder && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700">Set Reminder</span>
                                    </label>
                                </div>
                            </div>
                            
                            {noteForm.is_reminder && (
                                <div className="animate-in slide-in-from-top-2 duration-300">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Reminder Date</label>
                                    <input 
                                        type="date"
                                        value={noteForm.reminder_date}
                                        onChange={e => setNoteForm({...noteForm, reminder_date: e.target.value})}
                                        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-black font-medium bg-white shadow-sm"
                                    />
                                </div>
                            )}

                            <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm order-2 sm:order-1"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-sm shadow-indigo-100 shadow-xl order-1 sm:order-2"
                                >
                                    {isEditing ? 'Save Changes' : 'Create Note'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
