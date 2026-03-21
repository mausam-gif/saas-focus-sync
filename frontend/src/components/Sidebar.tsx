"use client";
import React from 'react';
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
    ClipboardList
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface SidebarProps {
    setIsSidebarOpen?: (isOpen: boolean) => void;
}

export const Sidebar = ({ setIsSidebarOpen }: SidebarProps) => {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();

    const getLinksByRole = () => {
        if (!user) return [];
        switch (user.role.toUpperCase()) {
            case 'ADMIN':
                return [
                    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
                    { name: 'Projects', href: '/admin/projects', icon: FolderKanban },
                    { name: 'Team', href: '/admin/team', icon: Users },
                    { name: 'Goals', href: '/admin/goals', icon: Target },
                    { name: 'Forms', href: '/admin/forms', icon: ClipboardList },
                    { name: 'Feedback', href: '/admin/feedback', icon: MessageSquare },
                ];
            case 'MANAGER':
                return [
                    { name: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
                    { name: 'Projects', href: '/admin/projects', icon: FolderKanban },
                    { name: 'Team', href: '/admin/team', icon: Users },
                    { name: 'Forms', href: '/admin/forms', icon: ClipboardList },
                ];
            case 'EMPLOYEE':
                return [
                    { name: 'Workspace', href: '/employee/dashboard', icon: LayoutDashboard },
                    { name: 'Projects', href: '/admin/projects', icon: FolderKanban },
                    { name: 'Forms', href: '/employee/forms', icon: ClipboardList },
                ];
            default:
                return [];
        }
    };

    const links = getLinksByRole();

    if (!pathname.includes('dashboard') && !pathname.includes('admin') && !pathname.includes('manager') && !pathname.includes('employee')) {
        return null; // Don't show sidebar on auth pages
    }

    return (
        <aside className="w-64 h-screen bg-[#F7F8FA] border-r border-gray-200 flex flex-col fixed left-0 top-0">
            <div className="p-6 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">E</span>
                </div>
                <span className="font-semibold text-gray-900 text-lg tracking-tight">FocusSync</span>
            </div>

            <div className="px-4 mb-4">
                <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm flex items-center space-x-3 cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {user?.name?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Loading...'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.role || 'Guest'}</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4 px-2">Navigation</div>
                {links.map((link) => {
                    const isActive = pathname.startsWith(link.href);
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            onClick={() => setIsSidebarOpen && setIsSidebarOpen(false)}
                            className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{link.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200 space-y-1">
                <button onClick={() => router.push('/notifications')} className="flex items-center space-x-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full text-left cursor-pointer">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                </button>
                <button onClick={() => router.push('/settings')} className="flex items-center space-x-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full text-left cursor-pointer">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                </button>
                <button onClick={logout} className="flex items-center space-x-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left mt-2 cursor-pointer">
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                </button>
            </div>
        </aside>
    );
};
