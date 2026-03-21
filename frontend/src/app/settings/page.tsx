"use client";
import React from 'react';
import { useAuth } from '@/lib/auth';
import { Settings, User, Shield, Bell, Lock } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();

    return (
        <div className="p-8 font-sans max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your account preferences and system configuration.</p>
            </div>

            <div className="space-y-6">
                <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 text-gray-900 font-semibold mb-4">
                        <User className="w-5 h-5 text-indigo-600" />
                        <h2>Profile Information</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400 uppercase">Full Name</label>
                            <p className="text-sm border-b border-gray-100 pb-2">{user?.name}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400 uppercase">Email Address</label>
                            <p className="text-sm border-b border-gray-100 pb-2">{user?.email}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400 uppercase">Account Role</label>
                            <p className="text-sm border-b border-gray-100 pb-2 font-bold text-indigo-600">{user?.role}</p>
                        </div>
                    </div>
                </section>

                <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 text-gray-900 font-semibold mb-4">
                        <Lock className="w-5 h-5 text-indigo-600" />
                        <h2>Security</h2>
                    </div>
                    <button className="text-sm text-indigo-600 font-medium hover:underline">Change Password</button>
                    <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                            <p className="text-xs text-gray-500">Add an extra layer of security to your account.</p>
                        </div>
                        <div className="w-10 h-5 bg-gray-200 rounded-full relative">
                            <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                        </div>
                    </div>
                </section>

                <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 text-gray-900 font-semibold mb-4">
                        <Bell className="w-5 h-5 text-indigo-600" />
                        <h2>Notifications</h2>
                    </div>
                    <div className="space-y-4">
                        {['Email notifications for new tasks', 'Browser push notifications', 'KPI report summaries'].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <p className="text-sm text-gray-700">{item}</p>
                                <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
                                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
