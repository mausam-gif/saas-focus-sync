"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Users, UserPlus, ShieldAlert, Loader2, Trash2, Pencil } from 'lucide-react';

import { useRouter } from 'next/navigation';

export default function TeamPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'EMPLOYEE',
        unit: '',
        phone: '',
        location: '',
        designation: ''
    });
    const [submitStatus, setSubmitStatus] = useState({ loading: false, error: '', success: '' });

    useEffect(() => {
        if (!authLoading && (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER'))) {
            router.push('/login');
            return;
        }

        if (authLoading || !user) return;

        // 1. Instant Load from Cache (SWR Pattern)
        const cacheKey = `team_data_${user.id}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
            try {
                setUsers(JSON.parse(cachedData));
                setLoading(false); // Immediate transition to content
            } catch (e) {
                console.error("Cache parse error", e);
            }
        }

        fetchUsers();
    }, [user, authLoading, router]);

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`users/${id}`);
            fetchUsers();
        } catch (err: any) {
            console.error('Failed to delete user', err);
            alert('Failed to delete user: ' + (err.response?.data?.detail || err.message));
        }
    };

    const fetchUsers = async () => {
        if (!user) return;
        try {
            const res = await api.get('users/');
            setUsers(res.data);

            // Update Cache
            const cacheKey = `team_data_${user.id}`;
            sessionStorage.setItem(cacheKey, JSON.stringify(res.data));
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setIsEditMode(false);
        setEditingUserId(null);
        setFormData({ 
            name: '', email: '', password: '', role: 'EMPLOYEE',
            unit: '', phone: '', location: '', designation: ''
        });
        setSubmitStatus({ loading: false, error: '', success: '' });
    };

    const openEditForm = (u: any) => {
        setIsEditMode(true);
        setEditingUserId(u.id);
        setFormData({
            name: u.name || '',
            email: u.email || '',
            password: '', // Leave empty unless changing
            role: u.role || 'EMPLOYEE',
            unit: u.unit || '',
            phone: u.phone || '',
            location: u.location || '',
            designation: u.designation || ''
        });
        setSubmitStatus({ loading: false, error: '', success: '' });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitStatus({ loading: true, error: '', success: '' });
        try {
            const data = { ...formData, unit: formData.unit || null };
            await api.post('users/', data);
            setSubmitStatus({ loading: false, error: '', success: 'User created successfully!' });
            resetForm();
            fetchUsers();
        } catch (err: any) {
            setSubmitStatus({
                loading: false,
                error: (err.response?.data?.detail || 'Failed to create user'),
                success: ''
            });
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUserId) return;
        setSubmitStatus({ loading: true, error: '', success: '' });
        try {
            const { password, ...updateData } = formData;
            const data: any = { ...updateData, unit: updateData.unit || null };
            if (password) data.password = password;

            await api.put(`users/${editingUserId}`, data);
            setSubmitStatus({ loading: false, error: '', success: 'User updated successfully!' });
            fetchUsers();
            setTimeout(() => resetForm(), 1000);
        } catch (err: any) {
            setSubmitStatus({
                loading: false,
                error: (err.response?.data?.detail || 'Failed to update user'),
                success: ''
            });
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>;

    return (
        <div className="p-4 sm:p-8 font-sans max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-blue-900 tracking-tight">Team Management</h1>
                <p className="text-sm text-gray-500 mt-1">Manage platform access, provision managers, and invite employees.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* User List */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 overflow-hidden w-full">
                    <div className="flex items-center space-x-2 mb-6 text-gray-900">
                        <Users className="w-5 h-5" />
                        <h2 className="text-base font-semibold">Current Organization Members</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WhatsApp</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {Array.isArray(users) && users.map((u: any) => (
                                    <tr key={u?.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                                         <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' :
                                                    u.role === 'MANAGER' ? 'bg-purple-100 text-purple-800' :
                                                        'bg-green-100 text-green-800'}`}>
                                                {u.role === 'ADMIN' ? 'Elite' : u.role === 'MANAGER' ? 'Creative Manager' : 'Elite Member'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {u.unit ? (
                                                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                    {u.unit.replace(/_/g, ' ')}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{u.phone || '-'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            <span className="text-indigo-600 font-medium italic">
                                                {u?.designation || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{u.location || '-'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                            <button onClick={() => openEditForm(u)} className="text-indigo-600 hover:text-indigo-900 font-medium transition-colors mr-3" title="Edit User">
                                                <Pencil className="w-4 h-4 inline" />
                                            </button>
                                            {user?.role === 'ADMIN' && u.email !== user?.email && (
                                                <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-900 font-medium transition-colors" title="Delete User">
                                                    <Trash2 className="w-4 h-4 inline" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create User Form */}
                <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 shadow-sm p-4 sm:p-6 h-fit">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-2 text-indigo-900">
                             {isEditMode ? <Pencil className="w-5 h-5 relative -top-0.5" /> : <UserPlus className="w-5 h-5 relative -top-0.5" />}
                            <h2 className="text-base font-semibold">{isEditMode ? 'Update User Details' : 'Provision New User'}</h2>
                        </div>
                        {isEditMode && (
                            <button onClick={resetForm} className="text-xs text-gray-500 hover:text-gray-700 font-medium bg-white px-2 py-1 rounded border border-gray-200">
                                Cancel
                            </button>
                        )}
                    </div>

                    <form onSubmit={isEditMode ? handleUpdateUser : handleCreateUser} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                required
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                type="text"
                                className="w-full border border-gray-200 bg-white text-black font-medium rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-gray-600"
                                 placeholder="Alice Johnson"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input
                                required
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                type="email"
                                className="w-full border border-gray-200 text-black font-medium bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-gray-600"
                                placeholder="alice@e5chronicles.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                            <input
                                required={!isEditMode}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                type="password"
                                className="w-full border border-gray-200 text-black font-medium bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-gray-600"
                                placeholder={isEditMode ? "•••••••• (Leave blank to keep same)" : "••••••••"}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Account Role</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full border border-gray-200 text-black font-medium bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            >
                                 <option value="EMPLOYEE">Elite Member</option>
                                {user?.role === 'ADMIN' && <option value="MANAGER">Creative Manager</option>}
                                {user?.role === 'ADMIN' && <option value="ADMIN">Elite (Admin)</option>}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit / Department</label>
                            <select
                                name="unit"
                                value={formData.unit}
                                onChange={handleChange}
                                className="w-full border border-gray-200 text-black font-medium bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="">Select Unit</option>
                                <option value="PRODUCTION">Production Unit</option>
                                <option value="CREATIVE_AND_STRATEGY">Creative & Strategy</option>
                                <option value="GROWTH_AND_ENGAGEMENT">Growth & Engagement</option>
                                <option value="TEAM_DEVELOPMENT">Team Development</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                            <input
                                name="designation"
                                value={formData.designation}
                                onChange={handleChange}
                                type="text"
                                className="w-full border border-gray-200 text-black font-medium bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-gray-600"
                                placeholder="Lead Editor, Cinematographer, etc."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp / Phone</label>
                            <input
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                type="text"
                                className="w-full border border-gray-200 text-black font-medium bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-gray-600"
                                placeholder="+977 98..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                type="text"
                                className="w-full border border-gray-200 text-black font-medium bg-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-gray-600"
                                placeholder="Kathmandu, Nepal"
                            />
                        </div>

                        {user?.role !== 'ADMIN' && (
                            <p className="text-xs text-gray-600 font-medium bg-white p-2 rounded-lg border border-gray-100">
                                Contact an administrator to provision new Managers or Admins.
                            </p>
                        )}

                        {submitStatus.error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100 flex items-start space-x-2">
                                <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{submitStatus.error}</span>
                            </div>
                        )}

                        {submitStatus.success && (
                            <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md border border-green-100 font-medium">
                                {submitStatus.success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitStatus.loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center"
                        >
                            {submitStatus.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditMode ? "Update Account" : "Create Account")}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
