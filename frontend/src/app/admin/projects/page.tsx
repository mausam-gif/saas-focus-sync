"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FolderKanban, Plus, Clock, Loader2, Target, Pencil, Trash2, X, Check, AlertTriangle } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
    'ACTIVE':    'bg-indigo-100 text-indigo-800 border-indigo-300',
    'ON TRACK':  'bg-blue-100   text-blue-800   border-blue-300',
    'AT RISK':   'bg-red-100    text-red-800    border-red-300',
    'COMPLETED': 'bg-green-100  text-green-800  border-green-300',
};

export default function ProjectsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

    // Create form state
    const [formData, setFormData] = useState({
        name: '',
        start_date: new Date().toISOString().split('T')[0],
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    // Edit modal state
    const [editProject, setEditProject] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ name: '', start_date: '', deadline: '', status: '' });
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Delete confirm state
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (authLoading || !user) return;
        fetchProjects();
    }, [user, authLoading, router]);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects/');
            setProjects(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await api.post('/projects/', formData);
            setFormData({
                name: '',
                start_date: new Date().toISOString().split('T')[0],
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            });
            fetchProjects();
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        } finally { setIsCreating(false); }
    };

    const handleStatusUpdate = async (projectId: number, newStatus: string) => {
        setStatusUpdating(projectId);
        try {
            await api.put(`/projects/${projectId}`, { status: newStatus });
            fetchProjects();
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        } finally { setStatusUpdating(null); }
    };

    const openEdit = (p: any) => {
        setEditProject(p);
        setEditForm({
            name: p.name,
            start_date: p.start_date?.split('T')[0] || '',
            deadline: p.deadline?.split('T')[0] || '',
            status: p.status || 'ACTIVE',
        });
    };

    const handleSaveEdit = async () => {
        if (!editProject) return;
        setIsSavingEdit(true);
        try {
            await api.put(`/projects/${editProject.id}`, editForm);
            setEditProject(null);
            fetchProjects();
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        } finally { setIsSavingEdit(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await api.delete(`/projects/${deleteTarget.id}`);
            setDeleteTarget(null);
            fetchProjects();
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        } finally { setIsDeleting(false); }
    };

    if (loading) return (
        <div className="p-8 flex items-center space-x-2 text-gray-500">
            <Loader2 className="animate-spin w-5 h-5" />
            <span className="text-sm">Loading projects...</span>
        </div>
    );

    return (
        <div className="p-8 font-sans max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Project Management</h1>
                <p className="text-sm text-gray-500 mt-1">Create, edit, and delete company projects.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Projects list */}
                <div className={`${user?.role === 'ADMIN' ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
                    <div className="flex items-center space-x-2 text-gray-900">
                        <FolderKanban className="w-5 h-5" />
                        <h2 className="text-base font-semibold">
                            Active Company Projects
                            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-normal">{projects.length}</span>
                        </h2>
                    </div>

                    {projects.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                            <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">No projects yet.</p>
                            <p className="text-xs mt-1">Use the form on the right to create your first project.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {projects.map((p: any) => (
                                <div key={p.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-semibold text-gray-900 truncate pr-2 flex-1">{p.name}</h3>
                                        <div className="flex items-center space-x-1 flex-shrink-0">
                                            {user?.role === 'ADMIN' && (
                                                <>
                                                    <button onClick={() => openEdit(p)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                        title="Edit project">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => setDeleteTarget(p)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                        title="Delete project">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') ? (
                                                <select
                                                    value={p.status || 'ACTIVE'}
                                                    disabled={statusUpdating === p.id}
                                                    onChange={(e) => handleStatusUpdate(p.id, e.target.value)}
                                                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border-2 outline-none cursor-pointer appearance-none transition-all shadow-sm ${STATUS_STYLES[p.status] || STATUS_STYLES['ACTIVE']}`}
                                                >
                                                    <option value="ACTIVE">ACTIVE</option>
                                                    <option value="ON TRACK">ON TRACK</option>
                                                    <option value="AT RISK">AT RISK</option>
                                                    <option value="COMPLETED">COMPLETED</option>
                                                </select>
                                            ) : (
                                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border-2 shadow-sm ${STATUS_STYLES[p.status] || STATUS_STYLES['ACTIVE']}`}>
                                                    {p.status || 'ACTIVE'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center text-sm text-gray-500">
                                            <Clock className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                                            <span>Starts: {new Date(p.start_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center text-sm font-medium text-indigo-600">
                                            <Target className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                                            <span>Deadline: {new Date(p.deadline).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Create form — Admin only */}
                {user?.role === 'ADMIN' && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit">
                        <div className="flex items-center space-x-2 mb-5 text-gray-900">
                            <Plus className="w-5 h-5" />
                            <h2 className="text-base font-semibold">New Project</h2>
                        </div>
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Project Name</label>
                                <input required value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    type="text"
                                    className="w-full border border-gray-200 bg-white text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder-gray-400"
                                    placeholder="E.g., Q3 Mobile App Launch" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                                <input required value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    type="date"
                                    className="w-full border border-gray-200 bg-white text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Deadline</label>
                                <input required value={formData.deadline}
                                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    type="date"
                                    className="w-full border border-gray-200 bg-white text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <button type="submit" disabled={isCreating}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-md disabled:bg-indigo-300 disabled:cursor-not-allowed mt-2">
                                {isCreating ? 'Creating...' : 'Launch Project'}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* ── Edit Modal ── */}
            {editProject && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                                <Pencil className="w-4 h-4 text-indigo-500" />
                                <span>Edit Project</span>
                            </h2>
                            <button onClick={() => setEditProject(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Project Name</label>
                                <input value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                <select value={editForm.status}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="ON TRACK">ON TRACK</option>
                                    <option value="AT RISK">AT RISK</option>
                                    <option value="COMPLETED">COMPLETED</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                                    <input type="date" value={editForm.start_date}
                                        onChange={e => setEditForm({ ...editForm, start_date: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Deadline</label>
                                    <input type="date" value={editForm.deadline}
                                        onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div className="flex space-x-3 pt-2">
                                <button onClick={() => setEditProject(null)}
                                    className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium">
                                    Cancel
                                </button>
                                <button onClick={handleSaveEdit} disabled={isSavingEdit}
                                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold flex items-center justify-center space-x-1.5 disabled:bg-indigo-300">
                                    <Check className="w-4 h-4" />
                                    <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Modal ── */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <h2 className="text-base font-semibold text-gray-900 mb-1">Delete Project?</h2>
                            <p className="text-sm text-gray-500 mb-1">
                                You are about to permanently delete:
                            </p>
                            <p className="text-sm font-semibold text-gray-900 mb-4">"{deleteTarget.name}"</p>
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-5">
                                ⚠️ All tasks linked to this project will also be affected. This cannot be undone.
                            </p>
                            <div className="flex space-x-3 w-full">
                                <button onClick={() => setDeleteTarget(null)}
                                    className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium">
                                    Cancel
                                </button>
                                <button onClick={handleDelete} disabled={isDeleting}
                                    className="flex-1 bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex items-center justify-center space-x-1.5 disabled:bg-red-300">
                                    <Trash2 className="w-4 h-4" />
                                    <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
