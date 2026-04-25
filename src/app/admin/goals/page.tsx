"use client";
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Target, CheckCircle2, Clock, Loader2, TrendingUp } from 'lucide-react';

export default function GoalsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (authLoading || !user) return;

        const fetchData = async () => {
            try {
                const [projRes, taskRes] = await Promise.all([
                    api.get('/projects/'),
                    api.get('/tasks/')
                ]);

                const enrichedProjects = projRes.data.map((p: any) => {
                    const projectTasks = taskRes.data.filter((t: any) => t.project_id === p.id);
                    const completed = projectTasks.filter((t: any) => t.status === 'DONE').length;
                    const total = projectTasks.length;
                    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

                    return { ...p, progress, totalTasks: total, completedTasks: completed };
                });

                setProjects(enrichedProjects);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, authLoading, router]);

    if (loading) return <div className="p-8"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>;

    return (
        <div className="p-8 font-sans max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Company Goals</h1>
                    <p className="text-sm text-gray-500 mt-1">Track the progress of active projects and key milestones.</p>
                </div>
                <div className="hidden md:flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-semibold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>On track for Q1 targets</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {projects.length > 0 ? projects.map((p: any) => (
                    <div key={p.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1 flex-1">
                                <div className="flex items-center space-x-2">
                                    <h3 className="text-lg font-semibold text-gray-900">{p.name}</h3>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                            p.status === 'AT RISK' ? 'bg-red-100 text-red-700' :
                                                p.status === 'ON TRACK' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                        }`}>
                                        {p.status || 'Active'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">Deadline: {new Date(p.deadline).toLocaleDateString()}</p>
                            </div>

                            <div className="flex items-center space-x-4 flex-1 max-w-md">
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between text-xs font-medium text-gray-600">
                                        <span>Progress</span>
                                        <span>{p.progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-600 transition-all duration-500"
                                            style={{ width: `${p.progress}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="flex -space-x-2">
                                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100 italic">
                                        {p.completedTasks}/{p.totalTasks} tasks
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${p.progress === 100 ? 'bg-green-50' : 'bg-gray-50'}`}>
                                    {p.progress === 100 ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <Clock className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                        <Target className="w-12 h-12 text-gray-200 mb-4" />
                        <h3 className="text-gray-900 font-medium">No projects found</h3>
                        <p className="text-gray-500 text-sm mt-1 max-w-xs">Create a project in the Projects tab to start tracking company goals.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
