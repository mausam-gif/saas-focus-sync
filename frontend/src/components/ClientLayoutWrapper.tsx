"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';

export const ClientLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/';

    if (isAuthPage) {
        return <main className="min-h-screen">{children}</main>;
    }

    return (
        <div className="flex relative">
            <Sidebar />
            <main className="flex-1 ml-64 min-h-screen">
                {children}
            </main>
        </div>
    );
};
