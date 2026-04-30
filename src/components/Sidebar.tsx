"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    Settings,
    Bell,
    LogOut,
    Target,
    MessageSquare,
    MessageCircle,
    ClipboardList,
    Contact2,
    StickyNote,
    AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface SidebarProps {
    setIsSidebarOpen?: (isOpen: boolean) => void;
}

interface UserStatus {
    unread_chat_count: number;
    has_group_unread: boolean;
    pending_tasks_count: number;
    active_projects_count: number;
    own_kpi: number;
    company_kpi_avg: number | null;
    is_kpi_red: boolean;
    is_company_kpi_red: boolean;
}

export const Sidebar = ({ setIsSidebarOpen }: SidebarProps) => {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [status, setStatus] = useState<UserStatus | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await api.get('/users/me/status');
            setStatus(res.data);
            
            // Update Cache
            if (user) {
                const cacheKey = `sidebar_status_${user.id}`;
                sessionStorage.setItem(cacheKey, JSON.stringify(res.data));
            }
        } catch (err) {
            console.error("Failed to fetch sidebar status", err);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            // 1. Instant Load from Cache (SWR Pattern)
            const cacheKey = `sidebar_status_${user.id}`;
            const cachedData = sessionStorage.getItem(cacheKey);
            if (cachedData) {
                try {
                    setStatus(JSON.parse(cachedData));
                } catch (e) {
                    console.error("Cache parse error", e);
                }
            }

            fetchStatus();
            const interval = setInterval(fetchStatus, 10000); // 10s polling
            return () => clearInterval(interval);
        }
    }, [user, fetchStatus]);


    const getLinksByRole = () => {
        if (!user) return [];
        switch (user.role.toUpperCase()) {
            case 'ADMIN':
                return [
                    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, badge: status?.is_company_kpi_red ? 'ALERT' : null },
                    { name: 'Projects', href: '/admin/projects', icon: FolderKanban, count: status?.active_projects_count },
                    { name: 'Clients', href: '/admin/clients', icon: Contact2 },
                    { name: 'Team', href: '/admin/team', icon: Users },
                    { name: 'Goals', href: '/admin/goals', icon: Target },
                    { name: 'Forms', href: '/admin/forms', icon: ClipboardList },
                    { name: 'Feedback', href: '/admin/feedback', icon: MessageSquare },
                    { name: 'Chat', href: '/chat', icon: MessageCircle, count: (status?.unread_chat_count || 0) + (status?.has_group_unread ? 1 : 0) },
                    { name: 'Notes', href: '/notes', icon: StickyNote },
                ];
            case 'MANAGER':
                return [
                    { name: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard, badge: status?.is_company_kpi_red ? 'ALERT' : null },
                    { name: 'Projects', href: '/admin/projects', icon: FolderKanban, count: status?.active_projects_count },
                    { name: 'Clients', href: '/admin/clients', icon: Contact2 },
                    { name: 'Team', href: '/admin/team', icon: Users },
                    { name: 'Forms', href: '/admin/forms', icon: ClipboardList },
                    { name: 'Chat', href: '/chat', icon: MessageCircle, count: (status?.unread_chat_count || 0) + (status?.has_group_unread ? 1 : 0) },
                    { name: 'Notes', href: '/notes', icon: StickyNote },
                ];
            case 'EMPLOYEE':
                return [
                    { name: 'Workspace', href: '/employee/dashboard', icon: LayoutDashboard, count: status?.pending_tasks_count },
                    { name: 'Projects', href: '/admin/projects', icon: FolderKanban, count: status?.active_projects_count },
                    { name: 'Forms', href: '/employee/forms', icon: ClipboardList },
                    { name: 'Chat', href: '/chat', icon: MessageCircle, count: (status?.unread_chat_count || 0) + (status?.has_group_unread ? 1 : 0) },
                    { name: 'Notes', href: '/notes', icon: StickyNote },
                ];
            default:
                return [];
        }
    };

    const links = getLinksByRole();

    if (!pathname || (!pathname.includes('dashboard') && !pathname.includes('admin') && !pathname.includes('manager') && !pathname.includes('employee') && !pathname.includes('notes') && !pathname.includes('chat') && !pathname.includes('notifications') && !pathname.includes('settings'))) {
        return null;
    }

    return (
        <aside className="w-full h-full bg-white border-r border-gray-100 flex flex-col shadow-sm font-sans relative">
            <div className="p-6 flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                    <span className="text-white font-bold text-lg">E</span>
                </div>
                <span className="font-bold text-gray-900 text-xl tracking-tight">FocusSync</span>
            </div>

            <div className="px-4 mb-4">
                <div onClick={() => router.push('/settings')} className={`bg-gray-50/50 rounded-2xl border ${status?.is_kpi_red ? 'border-red-200 bg-red-50/30' : 'border-gray-100'} p-3 flex items-center space-x-3 cursor-pointer hover:bg-white hover:shadow-md transition-all`}>
                    <div className={`w-9 h-9 rounded-full ${status?.is_kpi_red ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-700'} flex items-center justify-center font-bold text-sm`}>
                        {user?.name?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'User'}</p>
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="text-[10px] text-gray-500 font-semibold truncate lowercase tracking-tight">
                                {user?.role.toLowerCase()}
                            </span>
                            {status?.is_kpi_red && (
                                <span className="flex items-center gap-0.5 text-[9px] font-black text-red-600 uppercase tracking-tighter">
                                    <AlertTriangle className="w-2.5 h-2.5" /> LOW KPI
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 mt-6 px-3">Navigation</div>
                {links.map((link) => {
                    const isActive = pathname.startsWith(link.href);
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            onClick={() => setIsSidebarOpen && setIsSidebarOpen(false)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-indigo-600'
                                }`}
                        >
                            <div className="flex items-center space-x-3">
                                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'} transition-colors`} />
                                <span className="text-sm font-bold tracking-tight">{link.name}</span>
                            </div>
                            
                            {link.badge === 'ALERT' && (
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-200"></span>
                            )}
                            
                            {link.count !== undefined && link.count > 0 && (
                                <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg ${isActive ? 'bg-white text-indigo-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {link.count}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-50 space-y-1 bg-gray-50/20">
                <button onClick={() => router.push('/notifications')} className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-gray-500 hover:bg-gray-50 hover:text-indigo-600 w-full text-left font-bold text-sm group relative">
                    <div className="flex items-center space-x-3">
                        <Bell className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                        <span>Notifications</span>
                    </div>
                    {status?.is_kpi_red && (
                         <span className="absolute top-2.5 right-12 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                </button>
                <button onClick={logout} className="flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all text-gray-400 hover:bg-red-50 hover:text-red-600 w-full text-left mt-2 font-bold text-sm group">
                    <LogOut className="w-5 h-5 group-hover:text-red-600" />
                    <span>Log out</span>
                </button>
            </div>
        </aside>
    );
};
