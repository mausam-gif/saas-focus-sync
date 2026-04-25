"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { 
    Lock, 
    User as UserIcon, 
    Mail, 
    ShieldCheck, 
    Save, 
    Loader2,
    CheckCircle2,
    AlertCircle,
    Phone,
    MapPin,
    Briefcase
} from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        setIsUpdating(true);
        setMessage(null);
        try {
            await api.put('/users/me/password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update password' });
        } finally {
            setIsUpdating(false);
        }
    };

    if (!user) return null;

    const roleDisplay = {
        'ADMIN': 'Elite',
        'MANAGER': 'Creative Manager',
        'EMPLOYEE': 'Elite Member'
    }[user.role] || user.role;

    return (
        <div className="p-4 sm:p-8 font-sans max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Account Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your profile and security preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Overview */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                        <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4 text-indigo-700 font-bold text-2xl">
                            {user.name[0]}
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
                        <p className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block mt-2">
                            {roleDisplay}
                        </p>
                        
                        <div className="mt-6 pt-6 border-t border-gray-50 space-y-4 text-left">
                            <div className="flex items-center space-x-3 text-sm text-gray-600">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="truncate">{user.email}</span>
                            </div>
                            {user.unit && (
                                <div className="flex items-center space-x-3 text-sm text-gray-600">
                                    <Briefcase className="w-4 h-4 text-gray-400" />
                                    <span>{user.unit.replace(/_/g, ' ')}</span>
                                </div>
                            )}
                            {user.phone && (
                                <div className="flex items-center space-x-3 text-sm text-gray-600">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span>{user.phone}</span>
                                </div>
                            )}
                            {user.location && (
                                <div className="flex items-center space-x-3 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span>{user.location}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Password Change Form */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center space-x-2">
                            <Lock className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-base font-semibold text-gray-900">Security & Password</h2>
                        </div>
                        
                        <div className="p-6">
                            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                                {message && (
                                    <div className={`p-3 rounded-xl flex items-center space-x-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                        {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        <span>{message.text}</span>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            required
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Password</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            required
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                            placeholder="Min. 8 characters"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            required
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                            placeholder="Re-type new password"
                                        />
                                    </div>
                                </div>

                                <button 
                                    disabled={isUpdating}
                                    type="submit"
                                    className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 disabled:bg-indigo-300 mt-4"
                                >
                                    {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    <span>Update Password</span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
