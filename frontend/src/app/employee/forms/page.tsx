"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ClipboardList, CheckCircle, Clock, ChevronRight, Star, Loader2, TrendingUp } from 'lucide-react';

interface Assignment {
    id: number;
    form_id: number;
    form_title: string;
    is_submitted: boolean;
    due_date: string | null;
    score: number | null;
}

interface FormWithQuestions {
    id: number;
    title: string;
    description: string;
    questions: Array<{
        id: number;
        question_text: string;
        question_type: string;
        weight: number;
        options: string | null;
        order: number;
    }>;
}

export default function EmployeeFormsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [myScores, setMyScores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
    const [activeForm, setActiveForm] = useState<FormWithQuestions | null>(null);
    const [answers, setAnswers] = useState<Record<number, { answer_text?: string; numeric_value?: number }>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState<{ score: number } | null>(null);
    const [tab, setTab] = useState<'pending' | 'completed' | 'scores'>('pending');

    const loadData = useCallback(async () => {
        try {
            const [assignRes, scoresRes] = await Promise.all([
                api.get('/kpi-forms/my-forms'),
                api.get('/kpi-forms/scores/me')
            ]);
            setAssignments(assignRes.data);
            setMyScores(scoresRes.data);
        } catch { } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (!user) return;
        loadData();
    }, [user, authLoading, router, loadData]);

    const openForm = async (assignment: Assignment) => {
        try {
            // Use the employee-specific endpoint that doesn't require admin/manager role
            const res = await api.get(`/kpi-forms/assignment/${assignment.id}/form`);
            if (res.data) {
                setActiveForm(res.data);
                setActiveAssignment(assignment);
                setAnswers({});
                setSubmitted(null);
            }
        } catch (err: any) {
            alert('Could not load form: ' + (err.response?.data?.detail || err.message));
        }
    };


    const updateAnswer = (questionId: number, field: 'answer_text' | 'numeric_value', value: any) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: { ...prev[questionId], [field]: value }
        }));
    };

    const handleSubmit = async () => {
        if (!activeAssignment || !activeForm) return;
        setIsSubmitting(true);
        try {
            const payload = activeForm.questions.map(q => ({
                question_id: q.id,
                answer_text: answers[q.id]?.answer_text || null,
                numeric_value: answers[q.id]?.numeric_value ?? null
            }));
            const res = await api.post(`/kpi-forms/submit/${activeAssignment.id}`, { answers: payload });
            setSubmitted({ score: res.data.your_score });
            loadData();
        } catch (err: any) {
            alert('Submission failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderQuestion = (q: FormWithQuestions['questions'][0]) => {
        const val = answers[q.id];
        const options = q.options ? q.options.split(',').map(o => o.trim()) : [];

        switch (q.question_type) {
            case 'RATING':
                return (
                    <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <button key={n} type="button"
                                onClick={() => updateAnswer(q.id, 'numeric_value', n)}
                                className={`w-9 h-9 rounded-lg text-sm font-medium transition-all border ${val?.numeric_value === n ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:border-indigo-400'}`}>
                                {n}
                            </button>
                        ))}
                    </div>
                );
            case 'PERCENTAGE':
                return (
                    <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>0%</span>
                            <span className="text-indigo-600 font-bold">{val?.numeric_value ?? 50}%</span>
                            <span>100%</span>
                        </div>
                        <input type="range" min={0} max={100} value={val?.numeric_value ?? 50}
                            onChange={e => updateAnswer(q.id, 'numeric_value', parseInt(e.target.value))}
                            className="w-full accent-indigo-600" />
                    </div>
                );
            case 'NUMERIC':
                return (
                    <input type="number" min={0} value={val?.numeric_value ?? ''}
                        onChange={e => updateAnswer(q.id, 'numeric_value', parseFloat(e.target.value))}
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Enter a number..." />
                );
            case 'MULTIPLE_CHOICE':
                return (
                    <div className="space-y-2">
                        {options.map((opt, i) => (
                            <label key={i} className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${val?.answer_text === opt ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'}`}>
                                <input type="radio" name={`q-${q.id}`} value={opt}
                                    checked={val?.answer_text === opt}
                                    onChange={() => {
                                        // score by index: 0 = best (100), last = worst (0)
                                        const score = options.length > 1 ? ((options.length - 1 - i) / (options.length - 1)) * 100 : 100;
                                        updateAnswer(q.id, 'answer_text', opt);
                                        updateAnswer(q.id, 'numeric_value', score);
                                    }}
                                    className="accent-indigo-600" />
                                <span className="text-sm text-gray-800">{opt}</span>
                            </label>
                        ))}
                    </div>
                );
            case 'TEXT':
                return (
                    <textarea value={val?.answer_text ?? ''} rows={3}
                        onChange={e => updateAnswer(q.id, 'answer_text', e.target.value)}
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-gray-400"
                        placeholder="Enter your response..." />
                );
            default:
                return null;
        }
    };

    if (authLoading || !user) return null;
    if (loading) return <div className="p-8"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>;

    // ── Active Form View ──────────────────────────────────────────────────────
    if (activeForm && activeAssignment) {
        if (submitted) {
            return (
                <div className="p-8 max-w-2xl mx-auto text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Form Submitted!</h2>
                        <p className="text-gray-500 mt-1">Your responses have been recorded.</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
                        <p className="text-sm text-gray-500 mb-2">Your KPI Score</p>
                        <p className={`text-6xl font-black ${submitted.score >= 75 ? 'text-green-600' : submitted.score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {submitted.score}
                        </p>
                        <p className="text-gray-400 text-sm mt-1">out of 100</p>
                        <div className="w-full bg-gray-100 rounded-full h-3 mt-4">
                            <div className={`h-3 rounded-full ${submitted.score >= 75 ? 'bg-green-500' : submitted.score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                style={{ width: `${submitted.score}%` }} />
                        </div>
                    </div>
                    <button onClick={() => { setActiveForm(null); setActiveAssignment(null); setSubmitted(null); }}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700">
                        Back to Forms
                    </button>
                </div>
            );
        }

        return (
            <div className="p-8 max-w-2xl mx-auto space-y-6">
                <button onClick={() => { setActiveForm(null); setActiveAssignment(null); }} className="text-sm text-gray-500 hover:text-gray-700">
                    ← Back to Forms
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{activeForm.title}</h1>
                    {activeForm.description && <p className="text-gray-500 mt-1">{activeForm.description}</p>}
                </div>

                <div className="space-y-5">
                    {activeForm.questions.map((q, idx) => (
                        <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-xs font-bold text-indigo-500 uppercase">Q{idx + 1} · {q.question_type.replace('_', ' ')}</span>
                                    <p className="text-base font-medium text-gray-900 mt-1">{q.question_text}</p>
                                </div>
                                <span className="text-xs text-gray-400 font-medium">{Math.round(q.weight * 100)}% weight</span>
                            </div>
                            {renderQuestion(q)}
                        </div>
                    ))}
                </div>

                <button onClick={handleSubmit} disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-md disabled:bg-indigo-300 flex items-center justify-center space-x-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Form'}</span>
                </button>
            </div>
        );
    }

    // ── Forms List View ───────────────────────────────────────────────────────
    const pending = assignments.filter(a => !a.is_submitted);
    const completed = assignments.filter(a => a.is_submitted);

    return (
        <div className="p-8 font-sans max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">My Forms</h1>
                <p className="text-sm text-gray-500 mt-1">Complete your assigned KPI evaluation forms.</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                {([['pending', `Pending (${pending.length})`], ['completed', `Completed (${completed.length})`], ['scores', 'My Scores']] as ['pending' | 'completed' | 'scores', string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Pending */}
            {tab === 'pending' && (
                <div className="space-y-3">
                    {pending.length === 0 && (
                        <div className="text-center py-16 text-gray-400">
                            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40 text-green-400" />
                            <p className="font-medium text-green-600">All caught up! No pending forms.</p>
                        </div>
                    )}
                    {pending.map(a => (
                        <button key={a.id} onClick={() => openForm(a)}
                            className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex justify-between items-center hover:border-indigo-200 hover:shadow-md transition-all text-left">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{a.form_title}</p>
                                    {a.due_date && (
                                        <p className="text-xs text-gray-400 mt-0.5">Due: {new Date(a.due_date).toLocaleDateString()}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-1 rounded-full">Pending</span>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Completed */}
            {tab === 'completed' && (
                <div className="space-y-3">
                    {completed.length === 0 && (
                        <div className="text-center py-16 text-gray-400">
                            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p>No completed forms yet.</p>
                        </div>
                    )}
                    {completed.map(a => (
                        <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{a.form_title}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Submitted</p>
                                </div>
                            </div>
                            {a.score != null && (
                                <div className="text-right">
                                    <p className={`text-xl font-bold ${a.score >= 75 ? 'text-green-600' : a.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {a.score}
                                    </p>
                                    <p className="text-xs text-gray-400">KPI score</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* My Scores */}
            {tab === 'scores' && (
                <div className="space-y-4">
                    {myScores.length === 0 && (
                        <div className="text-center py-16 text-gray-400">
                            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p>No scores yet. Submit a form to see your KPI score.</p>
                        </div>
                    )}
                    {myScores.map(s => (
                        <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="font-semibold text-gray-900">{s.form_title}</p>
                                    <p className="text-xs text-gray-400">{new Date(s.calculated_at).toLocaleDateString()}</p>
                                </div>
                                <p className={`text-2xl font-black ${s.score >= 75 ? 'text-green-600' : s.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {s.score}
                                </p>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className={`h-2 rounded-full ${s.score >= 75 ? 'bg-green-500' : s.score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                    style={{ width: `${s.score}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
