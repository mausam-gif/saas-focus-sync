"use client";
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Menu, X } from 'lucide-react';

export const ClientLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/';
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Close sidebar on route change
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    if (isAuthPage) {
        return <main className="min-h-screen">{children}</main>;
    }

    return (
        <div className="flex relative bg-[#F7F8FA]">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 w-full h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">E</span>
                    </div>
                    <span className="font-semibold text-gray-900 text-lg tracking-tight">FocusSync</span>
                </div>
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 -mr-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                    aria-label="Toggle menu"
                >
                    {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Sidebar Container */}
            <div className={`fixed inset-y-0 left-0 z-50 transform lg:transform-none lg:static w-64 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <Sidebar setIsSidebarOpen={setIsSidebarOpen} />
            </div>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <main className="flex-1 w-full min-h-screen pt-16 lg:pt-0 pb-10">
                {children}
            </main>
        </div>
    );
};
