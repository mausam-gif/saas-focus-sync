"use client";
import React from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
    Users, Plus, Shield, CheckCircle, XCircle, 
    Calendar, Mail, Globe, Settings, LogOut,
    Building2, RefreshCcw, Activity, Trash2
} from 'lucide-react';

export default function SuperAdminDashboard() {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();
    const [organizations, setOrganizations] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isAddingOrg, setIsAddingOrg] = React.useState(false);
    const [newOrg, setNewOrg] = React.useState({
        name: '',
        slug: '',
        admin_email: '',
        admin_password: '',
        admin_name: '',
        subscription_expires_at: ''
    });

    const [selectedOrg, setSelectedOrg] = React.useState<any>(null);
    const [orgSettings, setOrgSettings] = React.useState<any>({ units: [], steps: [] });
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [newUnitName, setNewUnitName] = React.useState('');
    const [newStepName, setNewStepName] = React.useState('');
    const [newStepColor, setNewStepColor] = React.useState('#4F46E5');
    const [newAuto, setNewAuto] = React.useState({ stepId: 0, designation: '', title: '', desc: '' });
    const [designations, setDesignations] = React.useState<string[]>([]);
    const [editingItem, setEditingItem] = React.useState<{type: 'unit' | 'step' | 'auto', id: number, val: any} | null>(null);

    React.useEffect(() => {
        if (!authLoading && (!user || user.role !== 'SUPER_ADMIN')) {
            router.push('/login');
            return;
        }
        if (user?.role === 'SUPER_ADMIN') {
            fetchOrganizations();
            fetchDesignations();
        }
    }, [user, authLoading]);

    const fetchDesignations = async () => {
        try {
            const res = await api.get('super-admin/designations');
            setDesignations(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchOrganizations = async () => {
        try {
            const res = await api.get('super-admin/organizations');
            setOrganizations(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('super-admin/organizations', {
                name: newOrg.name,
                slug: newOrg.slug,
                subscription_expires_at: newOrg.subscription_expires_at || null
            }, {
                params: {
                    admin_email: newOrg.admin_email,
                    admin_password: newOrg.admin_password,
                    admin_name: newOrg.admin_name
                }
            });
            setIsAddingOrg(false);
            setNewOrg({ name: '', slug: '', admin_email: '', admin_password: '', admin_name: '', subscription_expires_at: '' });
            fetchOrganizations();
            alert("Organization created successfully!");
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            const message = typeof detail === 'string' ? detail : JSON.stringify(detail) || "Failed to create organization";
            alert(message);
        }
    };

    const toggleOrgStatus = async (org: any) => {
        try {
            await api.put(`super-admin/organizations/${org.id}`, {
                is_active: !org.is_active
            });
            fetchOrganizations();
        } catch (err) {
            alert("Failed to update status");
        }
    };

    const openSettings = async (org: any) => {
        setSelectedOrg(org);
        setIsSettingsOpen(true);
        fetchSettings(org.id);
    };

    const fetchSettings = async (orgId: number) => {
        try {
            const res = await api.get(`super-admin/organizations/${orgId}/settings`);
            setOrgSettings(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddUnit = async () => {
        if (!newUnitName.trim()) return;
        try {
            await api.post(`super-admin/organizations/${selectedOrg.id}/units`, null, { params: { name: newUnitName } });
            setNewUnitName('');
            fetchSettings(selectedOrg.id);
        } catch (err) { alert("Failed to add unit"); }
    };

    const handleDeleteUnit = async (id: number) => {
        try {
            await api.delete(`super-admin/units/${id}`);
            fetchSettings(selectedOrg.id);
        } catch (err) { alert("Failed to delete"); }
    };

    const handleAddStep = async () => {
        if (!newStepName.trim()) return;
        try {
            await api.post(`super-admin/organizations/${selectedOrg.id}/steps`, null, { 
                params: { name: newStepName, color: newStepColor, order: orgSettings.steps.length } 
            });
            setNewStepName('');
            fetchSettings(selectedOrg.id);
        } catch (err) { alert("Failed to add step"); }
    };

    const handleDeleteStep = async (id: number) => {
        try {
            await api.delete(`super-admin/steps/${id}`);
            fetchSettings(selectedOrg.id);
        } catch (err) { alert("Failed to delete"); }
    };

    const handleAddAuto = async (stepId: number) => {
        if (!newAuto.title || !newAuto.designation) return alert("Title and Designation required");
        try {
            await api.post(`super-admin/steps/${stepId}/automations`, null, {
                params: { 
                    designation: newAuto.designation, 
                    task_title: newAuto.title, 
                    task_description: newAuto.desc 
                }
            });
            setNewAuto({ stepId: 0, designation: '', title: '', desc: '' });
            fetchSettings(selectedOrg.id);
        } catch (err) { alert("Failed to add automation"); }
    };

    const handleDeleteAuto = async (id: number) => {
        try {
            await api.delete(`super-admin/automations/${id}`);
            fetchSettings(selectedOrg.id);
        } catch (err) { alert("Failed to delete"); }
    };

    const handleUpdateUnit = async (id: number, name: string) => {
        try {
            await api.put(`super-admin/units/${id}`, null, { params: { name } });
            setEditingItem(null);
            fetchSettings(selectedOrg.id);
        } catch (err) { alert("Update failed"); }
    };

    const handleUpdateStep = async (id: number, data: any) => {
        try {
            await api.put(`super-admin/steps/${id}`, null, { params: data });
            setEditingItem(null);
            fetchSettings(selectedOrg.id);
        } catch (err) { alert("Update failed"); }
    };

    const handleLoadDefaults = async () => {
        if (!confirm("Load standard project steps and departments?")) return;
        try {
            // Seed Units
            const defaultUnits = ["Creative", "Production", "Marketing", "HR", "Sales"];
            for (const name of defaultUnits) {
                await api.post(`super-admin/organizations/${selectedOrg.id}/units`, null, { params: { name } });
            }
            // Seed Steps
            const defaultSteps = [
                { name: "Briefing", color: "#6366F1" },
                { name: "Pre-Production", color: "#8B5CF6" },
                { name: "Production", color: "#EC4899" },
                { name: "Post-Production", color: "#F59E0B" },
                { name: "Final Delivery", color: "#10B981" }
            ];
            for (let i = 0; i < defaultSteps.length; i++) {
                await api.post(`super-admin/organizations/${selectedOrg.id}/steps`, null, { 
                    params: { ...defaultSteps[i], order: i } 
                });
            }
            fetchSettings(selectedOrg.id);
        } catch (err) { alert("Failed to load defaults"); }
    };

    if (authLoading || loading) return <div className="flex items-center justify-center h-screen">Loading Master Dashboard...</div>;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Navigation */}
            <nav className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center space-x-3">
                    <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tighter uppercase">SaaS Master Control</h1>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Platform Administrator</p>
                    </div>
                </div>
                    <div className="text-right flex items-center space-x-4">
                        <button 
                            onClick={async () => {
                                if(confirm("This will attempt to add missing columns to the production database. Proceed?")) {
                                    try {
                                        const res = await api.post('super-admin/migrate-db-dynamic');
                                        alert(res.data.message);
                                    } catch (err) {
                                        alert("Repair failed. Check logs.");
                                    }
                                }
                            }}
                            className="text-[10px] font-bold text-amber-600 hover:text-amber-700 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full flex items-center space-x-1 transition-all"
                        >
                            <RefreshCcw className="w-3 h-3" />
                            <span>Repair System Schema</span>
                        </button>
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                            <p className="text-[10px] text-gray-500">{user?.email}</p>
                        </div>
                        <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
            </nav>

            <main className="p-8 max-w-7xl mx-auto space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: "Total Organizations", value: organizations.length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
                        { label: "Active Licenses", value: organizations.filter(o => o.is_active).length, icon: Activity, color: "text-green-600", bg: "bg-green-50" },
                        { label: "Platform Status", value: "Healthy", icon: CheckCircle, color: "text-indigo-600", bg: "bg-indigo-50" },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                                    <h3 className="text-2xl font-black text-gray-900 mt-1">{stat.value}</h3>
                                </div>
                                <div className={`p-3 rounded-xl ${stat.bg}`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Organization List */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Registered Organizations</h2>
                            <p className="text-xs text-gray-500">Manage tenants and their subscription status.</p>
                        </div>
                        <button 
                            onClick={() => setIsAddingOrg(true)}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Organization</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Organization</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Slug/URL</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expires</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {organizations.map((org) => (
                                    <tr key={org.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                                                    {org.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{org.name}</p>
                                                    <p className="text-[10px] text-gray-400">Created {new Date(org.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                                                {org.slug}.yourapp.com
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border ${
                                                org.is_active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                                            }`}>
                                                {org.is_active ? 'Active' : 'Suspended'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-xs text-gray-500 font-medium">
                                                <Calendar className="w-3 h-3 mr-2" />
                                                {org.subscription_expires_at ? new Date(org.subscription_expires_at).toLocaleDateString() : 'Lifetime'}
                                            </div>
                                        </td>
                                         <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button 
                                                    onClick={() => openSettings(org)}
                                                    className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Organization Settings"
                                                >
                                                    <Settings className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => toggleOrgStatus(org)}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        org.is_active ? 'text-red-400 hover:bg-red-50' : 'text-green-400 hover:bg-green-50'
                                                    }`}
                                                >
                                                    <RefreshCcw className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {organizations.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            <p className="text-sm font-medium">No organizations registered yet.</p>
                                            <p className="text-xs mt-1">Start by adding your first client organization.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal for adding organization */}
            {isAddingOrg && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-indigo-50/20">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">New Organization</h2>
                                <p className="text-xs text-gray-500">Initialize a new tenant account.</p>
                            </div>
                            <button onClick={() => setIsAddingOrg(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                                <XCircle className="w-6 h-6 text-gray-300" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateOrg} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Org Name</label>
                                    <input required type="text" value={newOrg.name} 
                                        onChange={e => setNewOrg({...newOrg, name: e.target.value})}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        placeholder="e.g. Acme Corp" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">URL Slug</label>
                                    <input required type="text" value={newOrg.slug} 
                                        onChange={e => setNewOrg({...newOrg, slug: e.target.value.toLowerCase().replace(/ /g, '-')})}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        placeholder="acme-corp" />
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Initial Admin User</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <input required type="text" value={newOrg.admin_name}
                                        onChange={e => setNewOrg({...newOrg, admin_name: e.target.value})}
                                        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        placeholder="Admin Full Name" />
                                    <input required type="email" value={newOrg.admin_email}
                                        onChange={e => setNewOrg({...newOrg, admin_email: e.target.value})}
                                        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        placeholder="admin@acme.com" />
                                </div>
                                <input required type="password" value={newOrg.admin_password}
                                    onChange={e => setNewOrg({...newOrg, admin_password: e.target.value})}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    placeholder="Temporary Password" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subscription Expiry</label>
                                <input type="date" value={newOrg.subscription_expires_at}
                                    onChange={e => setNewOrg({...newOrg, subscription_expires_at: e.target.value})}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>

                            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                                Create Organization & Admin
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal for Organization Settings */}
            {isSettingsOpen && selectedOrg && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 sm:p-8">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-5xl h-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-100">
                                    {selectedOrg.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 leading-tight">{selectedOrg.name}</h2>
                                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Configuration Console</p>
                                </div>
                            </div>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-gray-100">
                                <XCircle className="w-8 h-8 text-gray-300" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Section 1: Units */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Team Departments</h3>
                                        <button onClick={handleLoadDefaults} className="text-[10px] font-bold text-indigo-500 hover:underline">
                                            LOAD SYSTEM DEFAULTS
                                        </button>
                                    </div>
                                    <div className="flex space-x-2">
                                        <input type="text" value={newUnitName} onChange={e => setNewUnitName(e.target.value)}
                                            placeholder="e.g. Creative, Marketing, HR"
                                            className="flex-1 bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        <button onClick={handleAddUnit} className="bg-indigo-600 text-white px-6 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {orgSettings.units.map((u: any) => (
                                            <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl group hover:border-indigo-200 transition-all">
                                                {editingItem?.type === 'unit' && editingItem.id === u.id ? (
                                                    <input autoFocus value={editingItem.val} 
                                                        onChange={e => setEditingItem({...editingItem, val: e.target.value})}
                                                        onBlur={() => handleUpdateUnit(u.id, editingItem.val)}
                                                        onKeyDown={e => e.key === 'Enter' && handleUpdateUnit(u.id, editingItem.val)}
                                                        className="text-sm font-bold text-gray-700 bg-gray-50 rounded px-2 py-1 outline-none w-full" />
                                                ) : (
                                                    <span onClick={() => setEditingItem({type: 'unit', id: u.id, val: u.name})} 
                                                        className="text-sm font-bold text-gray-700 cursor-pointer hover:text-indigo-600">
                                                        {u.name}
                                                    </span>
                                                )}
                                                <button onClick={() => handleDeleteUnit(u.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Section 2: Project Steps */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Project Pipeline Steps</h3>
                                        <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">{orgSettings.steps.length} STAGES</span>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" value={newStepName} onChange={e => setNewStepName(e.target.value)}
                                                placeholder="Step Name (e.g. Planning)"
                                                className="bg-white border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            <input type="color" value={newStepColor} onChange={e => setNewStepColor(e.target.value)}
                                                className="w-full h-[44px] bg-white rounded-xl cursor-pointer p-1" />
                                        </div>
                                        <button onClick={handleAddStep} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700">
                                            Add Pipeline Step
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {orgSettings.steps.map((step: any) => (
                                            <div key={step.id} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                                                <div className="p-4 flex items-center justify-between" style={{ borderLeft: `6px solid ${step.color}` }}>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-0.5">Stage {step.order + 1}</p>
                                                        {editingItem?.type === 'step' && editingItem.id === step.id ? (
                                                            <div className="flex items-center space-x-2">
                                                                <input autoFocus value={editingItem.val.name} 
                                                                    onChange={e => setEditingItem({...editingItem, val: {...editingItem.val, name: e.target.value}})}
                                                                    className="font-black text-gray-900 bg-gray-50 rounded px-2 py-1 outline-none" />
                                                                <input type="color" value={editingItem.val.color} 
                                                                    onChange={e => setEditingItem({...editingItem, val: {...editingItem.val, color: e.target.value}})}
                                                                    className="w-8 h-8 rounded cursor-pointer" />
                                                                <button onClick={() => handleUpdateStep(step.id, editingItem.val)} className="text-indigo-600 font-bold text-xs">SAVE</button>
                                                            </div>
                                                        ) : (
                                                            <h4 onClick={() => setEditingItem({type: 'step', id: step.id, val: {name: step.name, color: step.color}})} 
                                                                className="font-black text-gray-900 cursor-pointer hover:text-indigo-600">{step.name}</h4>
                                                        )}
                                                    </div>
                                                    <button onClick={() => handleDeleteStep(step.id)} className="p-2 text-gray-300 hover:text-red-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="p-4 bg-gray-50/50 border-t border-gray-50 space-y-3">
                                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Stage Automations</p>
                                                    <div className="space-y-2">
                                                        {step.automations?.map((a: any) => (
                                                            <div key={a.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                                <div className="min-w-0">
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">{a.designation}</p>
                                                                    <p className="text-xs font-bold text-gray-700 truncate">{a.task_title}</p>
                                                                </div>
                                                                <button onClick={() => handleDeleteAuto(a.id)} className="text-gray-300 hover:text-red-400 ml-2">
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Add Automation Sub-form */}
                                                    <div className="bg-white p-3 rounded-xl border border-dashed border-gray-200 space-y-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <select value={newAuto.stepId === step.id ? newAuto.designation : ''}
                                                                onChange={e => setNewAuto({...newAuto, stepId: step.id, designation: e.target.value})}
                                                                className="text-[10px] p-1.5 border-b border-gray-100 outline-none bg-transparent">
                                                                <option value="">Select Designation</option>
                                                                {designations.map(d => <option key={d} value={d}>{d}</option>)}
                                                                <option value="CUSTOM">+ Add Custom</option>
                                                            </select>
                                                            {newAuto.designation === 'CUSTOM' && (
                                                                <input type="text" placeholder="Custom Designation" 
                                                                    onBlur={e => setNewAuto({...newAuto, designation: e.target.value})}
                                                                    className="text-[10px] p-1.5 border-b border-gray-100 outline-none" />
                                                            )}
                                                            <input type="text" placeholder="Task Title (e.g. Upload Files)" value={newAuto.stepId === step.id ? newAuto.title : ''}
                                                                onChange={e => setNewAuto({...newAuto, stepId: step.id, title: e.target.value})}
                                                                className="text-[10px] p-1.5 border-b border-gray-100 outline-none" />
                                                        </div>
                                                        <button onClick={() => handleAddAuto(step.id)} className="w-full text-[10px] font-black text-indigo-600 hover:bg-indigo-50 py-1 rounded transition-colors">
                                                            + Set Automatic Task Rule
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
