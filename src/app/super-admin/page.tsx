"use client";
import React from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
    Users, Plus, Shield, CheckCircle, XCircle, 
    Calendar, Mail, Globe, Settings, LogOut,
    Building2, RefreshCcw, Activity
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

    React.useEffect(() => {
        if (!authLoading && (!user || user.role !== 'SUPER_ADMIN')) {
            router.push('/login');
            return;
        }
        if (user) fetchOrganizations();
    }, [user, authLoading]);

    const fetchOrganizations = async () => {
        try {
            const res = await api.get('/super-admin/organizations');
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
            await api.post('/super-admin/organizations', {
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
            await api.put(`/super-admin/organizations/${org.id}`, {
                is_active: !org.is_active
            });
            fetchOrganizations();
        } catch (err) {
            alert("Failed to update status");
        }
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
                <div className="flex items-center space-x-6">
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
                                            <button 
                                                onClick={() => toggleOrgStatus(org)}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    org.is_active ? 'text-red-400 hover:bg-red-50' : 'text-green-400 hover:bg-green-50'
                                                }`}
                                            >
                                                <RefreshCcw className="w-5 h-5" />
                                            </button>
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
        </div>
    );
}
