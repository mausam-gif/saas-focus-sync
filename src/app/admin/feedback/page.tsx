"use client";
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { MessageSquare, User, Calendar, Loader2 } from 'lucide-react';

export default function FeedbackPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [responses, setResponses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'ADMIN')) {
            router.push('/login');
            return;
        }

        if (authLoading || !user) return;

        const fetchFeedback = async () => {
            try {
                // Fetch questions to get context, then responses
                const questionsRes = await api.get('questions/');
                const allResponses: any[] = [];

                for (const q of questionsRes.data) {
                    const res = await api.get(`questions/`); // Should probably have a separate responses endpoint
                    // For now, assume the analytics or questions endpoint gives us what we need
                    // Let's refine the backend to actually return responses for these questions
                }

                // Temporary: just show questions as "feedback threads"
                setResponses(questionsRes.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchFeedback();
    }, [user, authLoading, router]);

    if (loading) return <div className="p-8"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>;

    return (
        <div className="p-8 font-sans max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Feedback & Progress</h1>
                <p className="text-sm text-gray-500 mt-1">Review team performance discussions and AI-generated check-ins.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {responses.map((q: any) => (
                    <div key={q.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Question Thread #{q.id}</h3>
                                    <p className="text-xs text-gray-500 flex items-center mt-0.5">
                                        <User className="w-3 h-3 mr-1" />
                                        Targeting Employee ID: {q.target_employee}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 italic text-sm text-gray-700">
                            "{q.question_text}"
                        </div>

                        <div className="flex items-center text-xs text-gray-400">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>System Log Reference</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
