"use client";
import React from 'react';
import { Bell, Info, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function NotificationsPage() {
    const mockNotifications = [
        { id: 1, type: 'info', title: 'Welcome to FocusSync', message: 'Your account is ready. Explore your dashboard.', time: '2 hours ago' },
        { id: 2, type: 'success', title: 'Goal Achieved!', message: 'Project "Mobile App MVP" reached 100% completion.', time: '5 hours ago' },
        { id: 3, type: 'warning', title: 'Task Deadline', message: 'One of your assigned tasks is due in 24 hours.', time: '1 day ago' },
    ];

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <div className="p-8 font-sans max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Notifications</h1>
                    <p className="text-sm text-gray-500 mt-1">Stay updated with the latest activity in your organization.</p>
                </div>
                <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Mark all as read</button>
            </div>

            <div className="space-y-4">
                {mockNotifications.map((n) => (
                    <div key={n.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start space-x-4 hover:border-indigo-100 transition-colors">
                        <div className={`p-2 rounded-xl bg-gray-50`}>
                            {getIcon(n.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-gray-900">{n.title}</h3>
                                <span className="text-[10px] text-gray-400 font-medium">{n.time}</span>
                            </div>
                            <p className="text-sm text-gray-600">{n.message}</p>
                        </div>
                    </div>
                ))}

                {mockNotifications.length === 0 && (
                    <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                        <Bell className="w-12 h-12 text-gray-200 mb-4" />
                        <h3 className="text-gray-900 font-medium">No new notifications</h3>
                        <p className="text-gray-500 text-sm mt-1">We'll let you know when something important happens.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
