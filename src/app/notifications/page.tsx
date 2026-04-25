"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Info, AlertCircle, CheckCircle2, MessageCircle, ClipboardList, TrendingDown, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface UserStatus {
    unread_chat_count: number;
    has_group_unread: boolean;
    pending_tasks_count: number;
    active_projects_count: number;
    own_kpi: number;
    is_kpi_red: boolean;
    is_company_kpi_red: boolean;
}

export default function NotificationsPage() {
    const { user } = useAuth();
    const [status, setStatus] = useState<UserStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await api.get('/users/me/status');
            setStatus(res.data);
        } catch (err) {
            console.error("Failed to fetch notification status", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const getRealNotifications = () => {
        if (!status) return [];
        const alerts = [];
        
        if (status.is_kpi_red) {
            alerts.push({
                id: 'kpi-alert',
                type: 'warning',
                title: 'Critical KPI Alert',
                message: `Your current performance score is ${status.own_kpi.toFixed(1)}%. Please review your pending forms and submissions.`,
                time: 'Just now',
                icon: <TrendingDown className="w-5 h-5 text-red-500" />
            });
        }
        
        if (status.unread_chat_count > 0 || status.has_group_unread) {
            alerts.push({
                id: 'chat-alert',
                type: 'info',
                title: 'New Messages',
                message: `You have ${status.unread_chat_count} unread private messages and active group discussions awaiting your response.`,
                time: 'Live',
                icon: <MessageCircle className="w-5 h-5 text-indigo-500" />
            });
        }
        
        if (status.pending_tasks_count > 0) {
            alerts.push({
                id: 'task-alert',
                type: 'info',
                title: 'Pending Obligations',
                message: `You have ${status.pending_tasks_count} tasks that require your attention to maintain your KPI score.`,
                time: 'Update',
                icon: <ClipboardList className="w-5 h-5 text-amber-500" />
            });
        }

        // Add some "history" mock notifications
        alerts.push({ id: 1, type: 'success', title: 'Welcome to FocusSync', message: 'Your elite account is active. Explore your dashboard.', time: '2 hours ago', icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> });
        
        return alerts;
    };

    const notifications = getRealNotifications();

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;

    return (
        <div className="p-4 sm:p-8 font-sans max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Feed</h1>
                    <p className="text-sm text-gray-400 mt-2 font-medium">Real-time performance and communication monitoring.</p>
                </div>
                <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest">Clear Alert Cache</button>
            </div>

            <div className="space-y-4">
                {notifications.map((n: any) => (
                    <div key={n.id} className={`p-6 rounded-3xl border transition-all flex items-start space-x-5 group ${n.id.toString().includes('alert') ? 'bg-white shadow-xl shadow-indigo-100/20 border-indigo-50' : 'bg-gray-50/30 border-gray-100 hover:bg-white hover:shadow-lg'}`}>
                        <div className={`p-3 rounded-2xl bg-white shadow-sm group-hover:scale-110 transition-transform`}>
                            {n.icon}
                        </div>
                        <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex justify-between items-center">
                                <h3 className={`text-base font-bold text-gray-900 tracking-tight ${n.id.toString().includes('alert') ? 'text-indigo-900' : 'text-gray-800'}`}>{n.title}</h3>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{n.time}</span>
                            </div>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed">{n.message}</p>
                        </div>
                    </div>
                ))}

                {notifications.length === 0 && (
                    <div className="bg-white p-16 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-100 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6">
                            <Bell className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-gray-900 font-bold text-xl">Operational Silence</h3>
                        <p className="text-gray-400 text-sm mt-3 font-medium max-w-[280px]">All systems are performing optimally with no critical alerts to report.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
