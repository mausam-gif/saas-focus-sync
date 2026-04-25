"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
    Plus, Trash2, ClipboardList, BarChart2, ChevronDown, ChevronUp,
    Loader2, CheckCircle, Clock, AlertCircle, Users, TrendingUp, Award
} from 'lucide-react';

type QuestionType = 'NUMERIC' | 'PERCENTAGE' | 'RATING' | 'MULTIPLE_CHOICE' | 'TEXT';
type Tab = 'create' | 'active' | 'analytics';

interface QuestionDraft {
    question_text: string;
    question_type: QuestionType;
    weight: number; // 0–100 (we convert to 0–1 on submit)
    options: string; // comma-separated for MC
}

const questionTypeLabels: Record<QuestionType, string> = {
    NUMERIC: '🔢 Numeric Input',
    PERCENTAGE: '📊 Percentage (0–100%)',
    RATING: '⭐ Rating Scale (1–10)',
    MULTIPLE_CHOICE: '✅ Multiple Choice',
    TEXT: '📝 Text Response',
};

export default function AdminFormsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('create');

    // Form creation state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [frequency, setFrequency] = useState('WEEKLY');
    const [questions, setQuestions] = useState<QuestionDraft[]>([
        { question_text: '', question_type: 'RATING', weight: 100, options: '' }
    ]);
    const [isCreating, setIsCreating] = useState(false);

    // Assign state
    const [forms, setForms] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [assigningFormId, setAssigningFormId] = useState<number | null>(null);
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
    const [isCompanyWide, setIsCompanyWide] = useState(false);
    const [dueDate, setDueDate] = useState('');

    // Analytics
    const [analytics, setAnalytics] = useState<any>(null);
    const [expandedForm, setExpandedForm] = useState<number | null>(null);
    const [assignments, setAssignments] = useState<any[]>([]);

    const loadForms = useCallback(async () => {
        try {
            const res = await api.get('/kpi-forms/');
            setForms(res.data);
        } catch { }
    }, []);

    const handleDeleteForm = async (formId: number, formTitle: string) => {
        if (!confirm(`Delete form "${formTitle}"? This will hide it from all views.`)) return;
        try {
            await api.delete(`/kpi-forms/${formId}`);
            loadForms();
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleRevokeAssignment = async (assignmentId: number, employeeName: string) => {
        if (!confirm(`Revoke form assignment for ${employeeName}?`)) return;
        try {
            await api.delete(`/kpi-forms/assignments/${assignmentId}`);
            setAssignments(prev => prev.filter((a: any) => a.id !== assignmentId));
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        }
    };

    const loadAnalytics = useCallback(async () => {
        try {
            const res = await api.get('/kpi-forms/analytics/overview');
            setAnalytics(res.data);
        } catch { }
    }, []);

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (!user) return;
        loadForms();
        loadAnalytics();
        api.get('/users/').then(res =>
            setEmployees(res.data.filter((u: any) => u.role?.toUpperCase() === 'EMPLOYEE'))
        );
    }, [user, authLoading, router, loadForms, loadAnalytics]);

    const totalWeight = questions.reduce((s, q) => s + q.weight, 0);

    const addQuestion = () => {
        setQuestions(prev => [...prev, { question_text: '', question_type: 'RATING', weight: 0, options: '' }]);
    };

    const removeQuestion = (idx: number) => {
        setQuestions(prev => prev.filter((_, i) => i !== idx));
    };

    const updateQuestion = (idx: number, field: keyof QuestionDraft, value: any) => {
        setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (Math.abs(totalWeight - 100) > 1) {
            return alert(`Question weights must sum to 100%. Current: ${totalWeight}%`);
        }
        setIsCreating(true);
        try {
            await api.post('/kpi-forms/', {
                title, description, frequency,
                questions: questions.map((q, i) => ({
                    question_text: q.question_text,
                    question_type: q.question_type,
                    weight: q.weight / 100,
                    options: q.options || null,
                    order: i
                }))
            });
            setTitle(''); setDescription(''); setFrequency('WEEKLY');
            setQuestions([{ question_text: '', question_type: 'RATING', weight: 100, options: '' }]);
            loadForms();
            setTab('active');
        } catch (err: any) {
            alert('Failed to create form: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsCreating(false);
        }
    };

    const handleAssign = async (formId: number) => {
        if (!isCompanyWide && selectedEmployees.length === 0) return alert('Select at least one employee.');
        try {
            await api.post(`/kpi-forms/${formId}/assign`, {
                employee_ids: isCompanyWide ? [] : selectedEmployees,
                is_company_wide: isCompanyWide,
                due_date: dueDate || null
            });
            alert('Form assigned successfully!');
            setAssigningFormId(null);
            setSelectedEmployees([]);
            setIsCompanyWide(false);
            setDueDate('');
            loadForms();
        } catch (err: any) {
            alert('Failed to assign: ' + (err.response?.data?.detail || err.message));
        }
    };

    const loadAssignments = async (formId: number) => {
        if (expandedForm === formId) { setExpandedForm(null); return; }
        try {
            const res = await api.get(`/kpi-forms/${formId}/assignments`);
            setAssignments(res.data);
            setExpandedForm(formId);
        } catch { }
    };

    if (authLoading || !user) return null;

    return (
        <div className="p-4 sm:p-8 font-sans max-w-7xl mx-auto space-y-6 sm:space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">KPI Forms</h1>
                <p className="text-sm text-gray-500 mt-1">Create dynamic evaluation forms and track employee performance.</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                {([['create', 'Create Form'], ['active', 'Active Forms'], ['analytics', 'Analytics']] as [Tab, string][]).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ── CREATE TAB ── */}
            {tab === 'create' && (
                <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Form Title *</label>
                            <input required value={title} onChange={e => setTitle(e.target.value)}
                                className="w-full border border-gray-300 bg-white text-black font-medium rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-600"
                                placeholder="e.g. Daily Productivity Check" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                            <select value={frequency} onChange={e => setFrequency(e.target.value)}
                                className="w-full border border-gray-300 bg-white text-black font-medium rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="ONE_TIME">One-Time</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                            className="w-full border border-gray-300 bg-white text-black font-medium rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-gray-600"
                            placeholder="What is this form measuring?" />
                    </div>

                    {/* Questions */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-900">Questions</h3>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${Math.abs(totalWeight - 100) <= 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                Total Weight: {totalWeight}% (must be 100%)
                            </span>
                        </div>

                        <div className="space-y-4">
                            {questions.map((q, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-indigo-600 uppercase">Question {idx + 1}</span>
                                        {questions.length > 1 && (
                                            <button type="button" onClick={() => removeQuestion(idx)} className="text-red-400 hover:text-red-600">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <input required value={q.question_text} onChange={e => updateQuestion(idx, 'question_text', e.target.value)}
                                        className="w-full border border-gray-300 bg-white text-black font-medium rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-600"
                                        placeholder="Enter your question..." />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Question Type</label>
                                            <select value={q.question_type} onChange={e => updateQuestion(idx, 'question_type', e.target.value as QuestionType)}
                                                className="w-full border border-gray-300 bg-white text-black font-medium rounded-lg p-2 text-sm outline-none">
                                                {Object.entries(questionTypeLabels).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Weight: {q.weight}%</label>
                                            <input type="range" min={0} max={100} value={q.weight}
                                                onChange={e => updateQuestion(idx, 'weight', parseInt(e.target.value))}
                                                className="w-full accent-indigo-600" />
                                        </div>
                                    </div>
                                    {q.question_type === 'MULTIPLE_CHOICE' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Options (comma-separated)</label>
                                            <input value={q.options} onChange={e => updateQuestion(idx, 'options', e.target.value)}
                                                className="w-full border border-gray-300 bg-white text-black font-medium rounded-lg p-2 text-sm outline-none placeholder-gray-600"
                                                placeholder="e.g. No issues, Minor issue, Major issue" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button type="button" onClick={addQuestion}
                            className="mt-4 flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                            <Plus className="w-4 h-4" /><span>Add Question</span>
                        </button>
                    </div>

                    <button type="submit" disabled={isCreating}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-md disabled:bg-indigo-300 flex items-center justify-center space-x-2">
                        {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                        <span>{isCreating ? 'Creating...' : 'Create KPI Form'}</span>
                    </button>
                </form>
            )}

            {/* ── ACTIVE FORMS TAB ── */}
            {tab === 'active' && (
                <div className="space-y-4">
                    {forms.length === 0 && (
                        <div className="text-center py-16 text-gray-400">
                            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p>No forms created yet. Go to "Create Form" to get started.</p>
                        </div>
                    )}
                    {forms.map(form => (
                        <div key={form.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 sm:p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center space-x-2 mb-1">
                                            <h3 className="font-semibold text-gray-900">{form.title}</h3>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{form.frequency}</span>
                                        </div>
                                        <p className="text-sm text-gray-500">{form.description || 'No description'}</p>
                                        <p className="text-xs text-gray-400 mt-1">By {form.creator_name} • {form.questions?.length || 0} questions</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                        <button onClick={() => loadAssignments(form.id)}
                                            className="flex items-center space-x-1 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                                            {expandedForm === form.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            <span>View Responses</span>
                                        </button>
                                        <button onClick={() => { setAssigningFormId(assigningFormId === form.id ? null : form.id); setSelectedEmployees([]); }}
                                            className="flex items-center space-x-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                                            <Users className="w-3 h-3" /><span>Assign</span>
                                        </button>
                                        <button onClick={() => handleDeleteForm(form.id, form.title)}
                                            className="flex items-center space-x-1 text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors" title="Delete form">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                {/* Assign Panel */}
                                {assigningFormId === form.id && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                        <div className="flex flex-col space-y-3">
                                            <label className="flex items-center space-x-2 p-2 rounded-lg border border-indigo-200 bg-indigo-50 cursor-pointer w-fit">
                                                <input type="checkbox" checked={isCompanyWide} onChange={e => setIsCompanyWide(e.target.checked)}
                                                    className="w-4 h-4 accent-indigo-600" />
                                                <span className="text-sm font-semibold text-indigo-700">Assign to All Member Types (Company KPI)</span>
                                            </label>

                                            {!isCompanyWide && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                    {employees.map(emp => (
                                                        <label key={emp.id} className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${selectedEmployees.includes(emp.id) ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'}`}>
                                                            <input type="checkbox" checked={selectedEmployees.includes(emp.id)}
                                                                onChange={e => setSelectedEmployees(prev => e.target.checked ? [...prev, emp.id] : prev.filter(id => id !== emp.id))}
                                                                className="accent-indigo-600" />
                                                            <span className="text-sm text-gray-800">{emp.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Due Date (optional)</label>
                                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                                    className="border border-gray-300 bg-white text-black font-medium rounded-lg p-2 text-sm outline-none" />
                                            </div>
                                            <button onClick={() => handleAssign(form.id)}
                                                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                                                {isCompanyWide ? 'Assign to All' : 'Assign Selected'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Assignments Panel */}
                                {expandedForm === form.id && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <h4 className="text-sm font-medium text-gray-700 mb-3">Submission Status</h4>
                                        {assignments.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-4">No assignments yet.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {assignments.map((a: any) => (
                                                    <div key={a.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                                                {a.employee_name?.charAt(0) || 'E'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-800">{a.employee_name}</p>
                                                                {a.due_date && <p className="text-xs text-gray-400">Due: {new Date(a.due_date).toLocaleDateString()}</p>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            {a.score != null && (
                                                                <span className={`text-sm font-bold ${a.score >= 75 ? 'text-green-600' : a.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                    {a.score}%
                                                                </span>
                                                            )}
                                                            {a.is_submitted ? (
                                                                <span className="flex items-center space-x-1 text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full">
                                                                    <CheckCircle className="w-3 h-3" /><span>Submitted</span>
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center space-x-1 text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-1 rounded-full">
                                                                    <Clock className="w-3 h-3" /><span>Pending</span>
                                                                </span>
                                                            )}
                                                            {!a.is_submitted && (
                                                                <button onClick={() => handleRevokeAssignment(a.id, a.employee_name)}
                                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Revoke assignment">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── ANALYTICS TAB ── */}
            {tab === 'analytics' && (
                <div className="space-y-6">
                    {!analytics ? (
                        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
                    ) : (
                        <>
                            {/* Overview Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Total Forms', value: analytics.total_forms, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                    { label: 'Total Assignments', value: analytics.total_assignments, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                                    { label: 'Completion Rate', value: `${analytics.completion_rate}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
                                    { label: 'Avg KPI Score', value: `${analytics.average_company_score}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
                                ].map((stat, i) => {
                                    const Icon = stat.icon;
                                    return (
                                        <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 mb-1">{stat.label}</p>
                                                    <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                                                </div>
                                                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                                                    <Icon className={`w-5 h-5 ${stat.color}`} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Top Performers */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <Award className="w-5 h-5 text-yellow-500" />
                                        <h3 className="font-semibold text-gray-900">Top Performers</h3>
                                    </div>
                                    {analytics.top_performers?.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-6">No submissions yet.</p>
                                    )}
                                    <div className="space-y-3">
                                        {analytics.top_performers?.map((emp: any, i: number) => (
                                            <div key={emp.employee_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                <div className="flex items-center space-x-3">
                                                    <span className={`text-sm font-bold w-6 text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-orange-400'}`}>#{i + 1}</span>
                                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                                                        {emp.employee_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800">{emp.employee_name}</p>
                                                        <p className="text-xs text-gray-400">{emp.submissions_count} submission(s)</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-green-600">{emp.average_score}</p>
                                                    <p className="text-xs text-gray-400">avg score</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Needs Attention */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                        <h3 className="font-semibold text-gray-900">Needs Attention</h3>
                                    </div>
                                    {analytics.low_performers?.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-6">No submissions yet.</p>
                                    )}
                                    <div className="space-y-3">
                                        {analytics.low_performers?.map((emp: any) => (
                                            <div key={emp.employee_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm">
                                                        {emp.employee_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800">{emp.employee_name}</p>
                                                        <p className="text-xs text-gray-400">{emp.submissions_count} submission(s)</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-lg font-bold ${emp.average_score < 50 ? 'text-red-600' : 'text-yellow-600'}`}>{emp.average_score}</p>
                                                    <p className="text-xs text-gray-400">avg score</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* All Employees Score Table */}
                            {analytics.all_employees?.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">All Employees KPI Scores</h3>
                                    <div className="space-y-2">
                                        {analytics.all_employees.map((emp: any) => (
                                            <div key={emp.employee_id} className="flex items-center space-x-4 p-3">
                                                <span className="text-sm font-medium text-gray-700 w-32 truncate">{emp.employee_name}</span>
                                                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                                                    <div className={`h-2.5 rounded-full transition-all ${emp.average_score >= 75 ? 'bg-green-500' : emp.average_score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                                        style={{ width: `${emp.average_score}%` }} />
                                                </div>
                                                <span className="text-sm font-bold text-gray-800 w-12 text-right">{emp.average_score}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
