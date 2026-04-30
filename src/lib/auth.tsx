"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';

type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'SUPER_ADMIN';

interface User {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    unit?: string;
    unit_id?: number;
    phone?: string;
    location?: string;
    manager_id: number | null;
    organization_id: number | null;
    organization?: {
        id: number;
        name: string;
        slug: string;
    };
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: () => { },
    logout: () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await api.get('users/me');
                    setUser(res.data);
                } catch (error) {
                    console.error("Failed to load user", error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };

        loadUser();
    }, []);

    const login = async (token: string) => {
        localStorage.setItem('token', token);
        try {
            const res = await api.get('users/me');
            setUser(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        // Force a page reload to clear any residual state and navigate to login
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
