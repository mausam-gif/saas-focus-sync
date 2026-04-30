"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api, API_BASE_URL } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { 
    FolderKanban, Plus, Clock, Loader2, Target, Pencil, Trash2, X, Check, 
    AlertTriangle, Users, UploadCloud, FileText, Image as ImageIcon, FileIcon
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
    'ANALYSIS':   'bg-blue-100 text-blue-800 border-blue-300',
    'STRATEGY':   'bg-purple-100 text-purple-800 border-purple-300',
    'EXECUTION':  'bg-orange-100 text-orange-800 border-orange-300',
    'ITERATION':  'bg-yellow-100 text-yellow-800 border-yellow-300',
    'EVALUATION': 'bg-green-100 text-green-800 border-green-300',
};

export default function ProjectsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [orgSettings, setOrgSettings] = useState<any>({ units: [], steps: [] });
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

    // Create form state
    const [formData, setFormData] = useState({
        name: '',
        client_id: '',
        start_date: new Date().toISOString().split('T')[0],
        shooting_date: '',
        delivery_date: '',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        service_category: '',
        client_value_proposition: '',
        total_budget: '',
        resource_allocation: '',
        logo_url: '',
    });
    const [projectDocs, setProjectDocs] = useState<File[]>([]);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    // Edit modal state
    const [editProject, setEditProject] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<any>({ 
        name: '', start_date: '', deadline: '', status: '', 
        client_id: '', shooting_date: '', delivery_date: '',
        service_category: '', client_value_proposition: '', 
        total_budget: '', current_spend: '', resource_allocation: '',
        problem_solved: '', shooting_fee: '', editing_fee: '', the_hook: '',
        logo_url: '',
    });
    const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
    const [editNewDocs, setEditNewDocs] = useState<File[]>([]);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Delete confirm state
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (authLoading || !user) return;
        fetchProjects();
        fetchOrgSettings();
    }, [user, authLoading, router]);

    const fetchOrgSettings = async () => {
        if (!user?.organization_id) return;
        try {
            const res = await api.get(`super-admin/organizations/${user.organization_id}/settings`);
            setOrgSettings(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchProjects = async () => {
        if (!user) return;
        try {
            const [projRes, clientRes] = await Promise.all([
                api.get('projects/'),
                api.get('clients/')
            ]);
            setProjects(projRes.data);
            setClients(clientRes.data);

            // Update Cache
            const cacheKey = `projects_data_${user.id}`;
            sessionStorage.setItem(cacheKey, JSON.stringify({
                projects: projRes.data,
                clients: clientRes.data,
                timestamp: Date.now()
            }));
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const { client_id, shooting_date, delivery_date, total_budget, start_date, deadline, ...rest } = formData;
            
            let uploadedLogoUrl = formData.logo_url;
            if (logoFile) {
                const logoData = new FormData();
                logoData.append('file', logoFile);
                const res = await api.post('upload/', logoData);
                uploadedLogoUrl = res.data.url;
            }

            const uploadedDocs = [];
            for (const file of projectDocs) {
                const d = new FormData();
                d.append('file', file);
                const res = await api.post('upload/', d);
                uploadedDocs.push({
                    file_name: file.name,
                    file_url: res.data.url,
                    file_type: res.data.content_type
                });
            }

            const payload = {
                ...rest,
                client_id: client_id ? parseInt(client_id as any) : null,
                start_date: start_date || null,
                deadline: deadline || null,
                shooting_date: shooting_date || null,
                delivery_date: delivery_date || null,
                total_budget: total_budget ? parseFloat(total_budget as any) : null,
                logo_url: uploadedLogoUrl,
                documents: uploadedDocs
            };
            
            await api.post('projects/', payload);
            setFormData({
                name: '',
                client_id: '',
                start_date: new Date().toISOString().split('T')[0],
                shooting_date: '',
                delivery_date: '',
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                service_category: '',
                client_value_proposition: '',
                total_budget: '',
                resource_allocation: '',
                logo_url: '',
            });
            setLogoFile(null);
            setProjectDocs([]);
            fetchProjects();
        } catch (err: any) {
            const errorData = err.response?.data?.detail;
            const errorMessage = Array.isArray(errorData) 
                ? errorData.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join('\n')
                : (typeof errorData === 'string' ? errorData : err.message);
            alert('Failed to launch project:\n' + errorMessage);
        } finally { setIsCreating(false); }
    };

    const handleStatusUpdate = async (projectId: number, newStatus: string) => {
        setStatusUpdating(projectId);
        try {
            await api.put(`projects/${projectId}`, { status: newStatus });
            fetchProjects();
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        } finally { setStatusUpdating(null); }
    };

    const openEdit = (p: any) => {
        setEditProject(p);
        setEditForm({
            name: p.name || '',
            start_date: p.start_date?.split('T')[0] || '',
            deadline: p.deadline?.split('T')[0] || '',
            status: p.status || 'ACTIVE',
            client_id: p.client_id || '',
            shooting_date: p.shooting_date?.split('T')[0] || '',
            delivery_date: p.delivery_date?.split('T')[0] || '',
            service_category: p.service_category || '',
            client_value_proposition: p.client_value_proposition || '',
            total_budget: p.total_budget || '',
            current_spend: p.current_spend || '',
            resource_allocation: p.resource_allocation || '',
            problem_solved: p.problem_solved || '',
            shooting_fee: p.shooting_fee || '',
            editing_fee: p.editing_fee || '',
            the_hook: p.the_hook || '',
            logo_url: p.logo_url || '',
        });
        setEditLogoFile(null);
        setEditNewDocs([]);
    };

    const handleSaveEdit = async () => {
        if (!editProject) return;
        setIsSavingEdit(true);
        try {
            const { client_id, total_budget, current_spend, shooting_fee, editing_fee, start_date, deadline, shooting_date, delivery_date, ...rest } = editForm;
            
            let uploadedLogoUrl = editForm.logo_url;
            if (editLogoFile) {
                const logoData = new FormData();
                logoData.append('file', editLogoFile);
                const res = await api.post('upload/', logoData);
                uploadedLogoUrl = res.data.url;
            }

            const uploadedDocs = [];
            for (const file of editNewDocs) {
                const d = new FormData();
                d.append('file', file);
                const res = await api.post('upload/', d);
                uploadedDocs.push({
                    file_name: file.name,
                    file_url: res.data.url,
                    file_type: res.data.content_type
                });
            }

            const payload = {
                ...rest,
                client_id: client_id ? parseInt(client_id) : null,
                start_date: start_date || null,
                deadline: deadline || null,
                shooting_date: shooting_date || null,
                delivery_date: delivery_date || null,
                total_budget: total_budget ? parseFloat(total_budget) : null,
                current_spend: current_spend ? parseFloat(current_spend) : null,
                shooting_fee: shooting_fee ? parseFloat(shooting_fee) : null,
                editing_fee: editing_fee ? parseFloat(editing_fee) : null,
                logo_url: uploadedLogoUrl,
                documents: uploadedDocs
            };
            
            await api.put(`projects/${editProject.id}`, payload);
            setEditProject(null);
            fetchProjects();
        } catch (err: any) {
            const errorData = err.response?.data?.detail;
            const errorMessage = Array.isArray(errorData) 
                ? errorData.map((e: any) => `${e.loc?.join('.') || 'error'}: ${e.msg}`).join('\n')
                : (typeof errorData === 'string' ? errorData : err.message);
            alert('Failed to update project:\n' + errorMessage);
        } finally { setIsSavingEdit(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await api.delete(`projects/${deleteTarget.id}`);
            setDeleteTarget(null);
            fetchProjects();
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        } finally { setIsDeleting(false); }
    };

    if (loading) return (
        <div className="p-4 sm:p-8 flex items-center space-x-2 text-gray-500">
            <Loader2 className="animate-spin w-5 h-5" />
            <span className="text-sm">Loading projects...</span>
        </div>
    );

    return (
        <div className="p-4 sm:p-8 font-sans max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Project Management</h1>
                <p className="text-sm text-gray-500 mt-1">Create, edit, and delete company projects.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {projects.map((p: any) => (
                                <div key={p.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex items-center space-x-3 mb-4">
                                        {p.logo_url ? (
                                            <div className="w-10 h-10 rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm flex-shrink-0">
                                                <img src={`${API_BASE_URL}${p.logo_url}`} alt="Project Logo" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                                                <FolderKanban className="w-5 h-5 text-indigo-600" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-semibold text-gray-900 truncate pr-2 group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                                                <div className="flex items-center space-x-1 flex-shrink-0">
                                                    {user?.role === 'ADMIN' && (
                                                        <>
                                                            <button onClick={() => openEdit(p)}
                                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold"
                                                                title="Edit project">
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button onClick={() => setDeleteTarget(p)}
                                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all font-bold"
                                                                title="Delete project">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                                        <div className="mt-4 pt-4 border-t border-gray-50">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Update Progress</p>
                                                <select
                                                    value={p.status}
                                                    disabled={statusUpdating === p.id}
                                                    onChange={(e) => handleStatusUpdate(p.id, e.target.value)}
                                                    className="text-[11px] font-bold px-3 py-1.5 rounded-xl border-2 outline-none cursor-pointer transition-all shadow-sm"
                                                    style={{ 
                                                        borderColor: orgSettings.steps.find((s:any) => s.name === p.status)?.color || '#e5e7eb',
                                                        backgroundColor: (orgSettings.steps.find((s:any) => s.name === p.status)?.color || '#e5e7eb') + '15',
                                                        color: orgSettings.steps.find((s:any) => s.name === p.status)?.color || '#374151'
                                                    }}
                                                >
                                                    {orgSettings.steps.map((s: any) => (
                                                        <option key={s.id} value={s.name}>{s.name}</option>
                                                    ))}
                                                    {/* Fallback for legacy data */}
                                                    {!orgSettings.steps.find((s:any) => s.name === p.status) && <option value={p.status}>{p.status}</option>}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {p.service_category && (
                                        <div className="mb-3 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase w-fit">
                                            {p.service_category}
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        {p.client?.business_name && (
                                            <div className="flex items-center text-sm text-gray-700 font-medium">
                                                <Users className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-gray-400" />
                                                <span>{p.client.business_name}</span>
                                            </div>
                                        )}
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
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 h-fit">
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
                                    className="w-full border border-gray-200 bg-white text-black font-medium rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder-gray-600"
                                    placeholder="E.g., Cinematic Car Shoot" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Link Client</label>
                                <select 
                                    value={formData.client_id}
                                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                    className="w-full border border-gray-200 bg-white text-black font-medium rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">No Client (Internal)</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                                    <input required value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        type="date"
                                        className="w-full border border-gray-200 bg-white text-black font-medium rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Deadline</label>
                                    <input required value={formData.deadline}
                                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                        type="date"
                                        className="w-full border border-gray-200 bg-white text-black font-medium rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Service Category</label>
                                <input value={formData.service_category}
                                    onChange={(e) => setFormData({ ...formData, service_category: e.target.value })}
                                    className="w-full border border-gray-200 bg-white text-black font-medium rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-600"
                                    placeholder="Wedding Reel, Commercial, etc." />
                            </div>

                            {/* Logo Upload */}
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-700">Project Logo (Optional)</label>
                                <div className="flex items-center space-x-4">
                                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                                        {logoFile ? (
                                            <img src={URL.createObjectURL(logoFile)} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-6 h-6 text-gray-300" />
                                        )}
                                    </div>
                                    <label className="flex-1 cursor-pointer">
                                        <div className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                            <UploadCloud className="w-4 h-4 text-gray-400" />
                                            <span className="text-xs font-medium text-gray-600">Choose Logo</span>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                                    </label>
                                </div>
                            </div>

                            {/* Document Upload */}
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-700">Foundational Documents</label>
                                <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className="flex flex-col items-center justify-center pb-1">
                                        <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                                        <p className="text-xs text-gray-500 font-medium">Click to upload briefs, moodboards, etc.</p>
                                    </div>
                                    <input type="file" className="hidden" multiple onChange={e => {
                                        if (e.target.files) setProjectDocs(prev => [...prev, ...Array.from(e.target.files!)]);
                                    }} />
                                </label>
                                {projectDocs.length > 0 && (
                                    <div className="space-y-1.5 mt-2">
                                        {projectDocs.map((file, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-100 rounded-lg group">
                                                <div className="flex items-center space-x-2 truncate">
                                                    <FileText className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                                    <span className="text-[11px] font-medium text-gray-700 truncate">{file.name}</span>
                                                </div>
                                                <button type="button" onClick={() => setProjectDocs(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="text-gray-400 hover:text-red-500 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                                <Pencil className="w-4 h-4 text-indigo-500" />
                                <span>Edit Project</span>
                            </h2>
                            <button onClick={() => setEditProject(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            {/* Basic Info */}
                            <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Foundational Basic Info</h3>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Project Name</label>
                                    <input value={editForm.name}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-600 text-black font-medium" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                        <select value={editForm.status}
                                            onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-black">
                                            {orgSettings.steps.map((s: any) => (
                                                <option key={s.id} value={s.name}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Service Category</label>
                                        <input value={editForm.service_category}
                                            onChange={e => setEditForm({ ...editForm, service_category: e.target.value })}
                                            placeholder="e.g. Cinematic Car Shoot"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-600 text-black" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
                                    <select value={editForm.client_id}
                                        onChange={e => setEditForm({ ...editForm, client_id: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-black">
                                        <option value="">No Client (Internal)</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                                        <input type="date" value={editForm.start_date}
                                            onChange={e => setEditForm({ ...editForm, start_date: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-black" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Deadline</label>
                                        <input type="date" value={editForm.deadline}
                                            onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-black" />
                                    </div>
                                </div>
                            </div>

                            {/* Ongoing / During */}
                            <div className="space-y-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider text-gray-900">Ongoing Project Details</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Shooting Date</label>
                                        <input type="date" value={editForm.shooting_date}
                                            onChange={e => setEditForm({ ...editForm, shooting_date: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Final Delivery Date</label>
                                        <input type="date" value={editForm.delivery_date}
                                            onChange={e => setEditForm({ ...editForm, delivery_date: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Client Value Proposition</label>
                                    <input value={editForm.client_value_proposition}
                                        onChange={e => setEditForm({ ...editForm, client_value_proposition: e.target.value })}
                                        placeholder="What do they care about most?"
                                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Total Budget (NPR)</label>
                                        <input type="number" value={editForm.total_budget}
                                            onChange={e => setEditForm({ ...editForm, total_budget: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Current Spend</label>
                                        <input type="number" value={editForm.current_spend}
                                            onChange={e => setEditForm({ ...editForm, current_spend: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Resource Allocation (On-site)</label>
                                    <input value={editForm.resource_allocation}
                                        onChange={e => setEditForm({ ...editForm, resource_allocation: e.target.value })}
                                        placeholder="e.g. Director, Assistant"
                                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>

                            {/* Post Completion */}
                            <div className="space-y-3 p-4 bg-green-50/50 rounded-xl border border-green-100">
                                <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider text-gray-900">Post-Completion Intelligence</h3>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">The Problem / Pain Point</label>
                                    <input value={editForm.problem_solved}
                                        onChange={e => setEditForm({ ...editForm, problem_solved: e.target.value })}
                                        placeholder="Why did they hire us?"
                                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Shooting Fee</label>
                                        <input type="number" value={editForm.shooting_fee}
                                            onChange={e => setEditForm({ ...editForm, shooting_fee: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Editing Fee</label>
                                        <input type="number" value={editForm.editing_fee}
                                            onChange={e => setEditForm({ ...editForm, editing_fee: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">The "Hook" / Preferred Style</label>
                                    <input value={editForm.the_hook}
                                        onChange={e => setEditForm({ ...editForm, the_hook: e.target.value })}
                                        placeholder="What style did they like?"
                                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>

                            {/* Assets (Logo & Documents) */}
                            <div className="space-y-4 p-4 bg-indigo-50/30 rounded-xl border border-indigo-100">
                                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Project Assets</h3>
                                
                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-700">Project Logo</label>
                                    <div className="flex items-center space-x-4">
                                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-white shadow-sm flex-shrink-0">
                                            {editLogoFile ? (
                                                <img src={URL.createObjectURL(editLogoFile)} alt="Preview" className="w-full h-full object-cover" />
                                            ) : editForm.logo_url ? (
                                                <img src={editForm.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-6 h-6 text-gray-300" />
                                            )}
                                            {(editLogoFile || editForm.logo_url) && (
                                                <button onClick={() => { setEditLogoFile(null); setEditForm({ ...editForm, logo_url: '' }); }}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        <label className="flex-1 cursor-pointer">
                                            <div className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors shadow-sm">
                                                <UploadCloud className="w-4 h-4 text-gray-400" />
                                                <span className="text-xs font-medium text-gray-600 font-semibold">Change Logo</span>
                                            </div>
                                            <input type="file" className="hidden" accept="image/*" onChange={e => setEditLogoFile(e.target.files?.[0] || null)} />
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-700">Add Foundational Documents</label>
                                    <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors cursor-pointer group">
                                        <div className="flex flex-col items-center justify-center pb-1">
                                            <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                                            <p className="text-xs text-gray-500 font-medium">Upload new briefs or assets</p>
                                        </div>
                                        <input type="file" className="hidden" multiple onChange={e => {
                                            if (e.target.files) setEditNewDocs(prev => [...prev, ...Array.from(e.target.files!)]);
                                        }} />
                                    </label>
                                    {editNewDocs.length > 0 && (
                                        <div className="space-y-1.5 mt-2">
                                            {editNewDocs.map((file, i) => (
                                                <div key={i} className="flex items-center justify-between p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg group">
                                                    <div className="flex items-center space-x-2 truncate">
                                                        <FileText className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                                        <span className="text-[11px] font-medium text-gray-700 truncate">{file.name}</span>
                                                    </div>
                                                    <button type="button" onClick={() => setEditNewDocs(prev => prev.filter((_, idx) => idx !== i))}
                                                        className="text-gray-400 hover:text-red-500 transition-colors">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
