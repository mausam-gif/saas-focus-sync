"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    UploadCloud, CheckCircle2, Clock, MessageSquare, Briefcase,
    TrendingUp, AlertCircle, Send, Paperclip, Mic, MicOff,
    CalendarDays, BarChart2, FileText
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api, API_BASE_URL } from '@/lib/api';
import { GanttChart } from '@/components/GanttChart';

export default function EmployeeDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    // ── State ───────────────────────────────────────────────────────────────────
    const [tasks, setTasks] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [myScores, setMyScores] = useState<any[]>([]);
    const [pendingForms, setPendingForms] = useState<number>(0);

    const [projectId, setProjectId] = useState<string>('');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [replies, setReplies] = useState<{ [key: number]: string }>({});
    const [replyFiles, setReplyFiles] = useState<{ [key: number]: File | null }>({});
    const [isRecording, setIsRecording] = useState<{ [key: number]: boolean }>({});
    const [mediaRecorders, setMediaRecorders] = useState<{ [key: number]: MediaRecorder | null }>({});
    const [isUpdatingTask, setIsUpdatingTask] = useState<{ [key: number]: boolean }>({});

    // ── Data loading ────────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        if (!user) return;
        const [tasksRes, questionsRes, projectsRes, scoresRes, assignmentsRes] = await Promise.allSettled([
            api.get('/tasks/'),
            api.get('/questions/'),
            api.get('/projects/'),
            api.get('/kpi-forms/scores/me'),
            api.get('/kpi-forms/my-forms'),
        ]);
        if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value.data);
        if (questionsRes.status === 'fulfilled') setQuestions(questionsRes.value.data);
        if (projectsRes.status === 'fulfilled') setProjects(projectsRes.value.data);
        if (scoresRes.status === 'fulfilled') setMyScores(scoresRes.value.data);
        if (assignmentsRes.status === 'fulfilled') {
            setPendingForms(assignmentsRes.value.data.filter((a: any) => !a.is_submitted).length);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (user && !authLoading) loadData();
    }, [user, authLoading, router, loadData]);

    if (authLoading || !user) return null;

    // ── Derived values ──────────────────────────────────────────────────────────
    const today = new Date();
    const latestScore = myScores.length > 0 ? myScores[myScores.length - 1].score : null;
    const avgScore = myScores.length > 0
        ? Math.round(myScores.reduce((s, x) => s + x.score, 0) / myScores.length)
        : null;
    const kpiColor = latestScore === null ? 'gray' : latestScore >= 75 ? 'green' : latestScore >= 50 ? 'yellow' : 'red';
    const kpiLabel = latestScore === null ? 'No data yet'
        : latestScore >= 75 ? '✅ High Performer'
        : latestScore >= 50 ? '⚠️ Average'
        : '🔴 Needs Improvement';

    const pendingTasks = tasks.filter(t => t.status !== 'DONE');
    const doneTasks = tasks.filter(t => t.status === 'DONE');
    const unreadMessages = questions.filter(q => !q.responses || q.responses.length === 0).length;

    // Gantt tasks — ALL projects visible to employee
    const ganttTasks = projects.map((p: any) => {
        let progress = 20;
        let customClass = 'bar-analysis';
        const s = p.status?.toUpperCase();
        if (s === 'EVALUATION' || s === 'COMPLETED') { progress = 100; customClass = 'bar-evaluation'; }
        else if (s === 'ITERATION') { progress = 80; customClass = 'bar-iteration'; }
        else if (s === 'EXECUTION') { progress = 60; customClass = 'bar-execution'; }
        else if (s === 'STRATEGY') { progress = 40; customClass = 'bar-strategy'; }
        else { progress = 20; customClass = 'bar-analysis'; }

        const start = p.start_date ? p.start_date.split('T')[0] : today.toISOString().split('T')[0];
        const rawEnd = p.deadline ? p.deadline.split('T')[0] : start;
        const end = rawEnd <= start ? start : rawEnd;
        return {
            id: `proj-${p.id}`,
            name: p.name,
            start,
            end,
            progress,
            dependencies: '',
            custom_class: customClass,
        };
    });

    // ── Handlers ────────────────────────────────────────────────────────────────
    const handleSubmitWork = async () => {
        if (!projectId) return alert('Please select a project.');
        if (!uploadFile && !comment) return alert('Please attach a file or add a comment.');
        setIsSubmitting(true);
        try {
            let fileUrl = '';
            if (uploadFile) {
                const formData = new FormData();
                formData.append('file', uploadFile);
                const res = await api.post('/upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                fileUrl = `${API_BASE_URL}${res.data.url}`;
            }
            await api.post('/submissions/', { project_id: parseInt(projectId), file_url: fileUrl, comment });
            setUploadFile(null);
            setComment('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) {
            alert('Failed to submit: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateTaskStatus = async (taskId: number, currentStatus: string) => {
        const statuses = ['TODO', 'IN_PROGRESS', 'DONE'];
        const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
        setIsUpdatingTask(prev => ({ ...prev, [taskId]: true }));
        try {
            await api.put(`/tasks/${taskId}`, { status: nextStatus });
            setTasks(prev => prev.map((t: any) => t.id === taskId ? { ...t, status: nextStatus } : t));
        } catch { alert('Failed to update task.'); }
        finally { setIsUpdatingTask(prev => ({ ...prev, [taskId]: false })); }
    };

    const handleReply = async (questionId: number) => {
        const text = replies[questionId];
        const file = replyFiles[questionId];
        if (!text && !file) return alert('Please type a message or attach a file.');
        try {
            let attachmentUrl: string | null = null;
            let attachmentType: string | null = null;
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                const res = await api.post('/upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                attachmentUrl = res.data.url;
                attachmentType = res.data.type;
            }
            await api.post(`/questions/${questionId}/responses`, {
                response_text: text || (attachmentType === 'audio' ? '🎵 Audio message' : '📄 File attached'),
                question_id: questionId,
                attachment_url: attachmentUrl,
                attachment_type: attachmentType,
            });
            setReplies(prev => ({ ...prev, [questionId]: '' }));
            setReplyFiles(prev => ({ ...prev, [questionId]: null }));
            loadData();
        } catch (err: any) {
            alert('Failed to send: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleToggleRecording = async (questionId: number) => {
        if (isRecording[questionId] && mediaRecorders[questionId]) {
            mediaRecorders[questionId]!.stop();
            setIsRecording(prev => ({ ...prev, [questionId]: false }));
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const chunks: BlobPart[] = [];
                const rec = new MediaRecorder(stream);
                rec.ondataavailable = e => chunks.push(e.data);
                rec.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    const f = new File([blob], `reply-${Date.now()}.webm`, { type: 'audio/webm' });
                    setReplyFiles(prev => ({ ...prev, [questionId]: f }));
                    stream.getTracks().forEach(t => t.stop());
                };
                rec.start();
                setMediaRecorders(prev => ({ ...prev, [questionId]: rec }));
                setIsRecording(prev => ({ ...prev, [questionId]: true }));
            } catch { alert('Microphone access denied.'); }
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="p-4 sm:p-8 font-sans max-w-7xl mx-auto space-y-6 sm:space-y-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">My Workspace</h1>
                    <p className="text-sm text-gray-500 mt-1">Track your tasks, KPI performance, and project deadlines.</p>
                </div>
                <span className="flex items-center space-x-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-full font-medium text-sm border border-green-100">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Online</span>
                </span>
            </div>

            {/* ── Stats row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* KPI Score card */}
                <div className={`bg-white rounded-2xl border shadow-sm p-5 col-span-2 md:col-span-1 ${
                    kpiColor === 'green' ? 'border-green-200' : kpiColor === 'yellow' ? 'border-yellow-200' : kpiColor === 'red' ? 'border-red-200' : 'border-gray-100'
                }`}>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">My KPI Score</p>
                        <BarChart2 className={`w-4 h-4 ${kpiColor === 'green' ? 'text-green-500' : kpiColor === 'yellow' ? 'text-yellow-500' : kpiColor === 'red' ? 'text-red-500' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-4xl font-black ${kpiColor === 'green' ? 'text-green-600' : kpiColor === 'yellow' ? 'text-yellow-500' : kpiColor === 'red' ? 'text-red-600' : 'text-gray-300'}`}>
                        {latestScore !== null ? latestScore : '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{kpiLabel}</p>
                    {latestScore !== null && (
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                            <div className={`h-1.5 rounded-full ${kpiColor === 'green' ? 'bg-green-500' : kpiColor === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`}
                                style={{ width: `${latestScore}%` }} />
                        </div>
                    )}
                    {myScores.length > 1 && avgScore !== null && (
                        <p className="text-xs text-gray-400 mt-2">Avg: <span className="font-semibold text-gray-600">{avgScore}</span> over {myScores.length} submissions</p>
                    )}
                    {pendingForms > 0 && (
                        <a href="/employee/forms" className="mt-3 flex items-center space-x-1 text-xs text-indigo-600 font-medium hover:underline">
                            <FileText className="w-3 h-3" />
                            <span>{pendingForms} pending form{pendingForms > 1 ? 's' : ''} →</span>
                        </a>
                    )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Tasks</p>
                        <Clock className="w-4 h-4 text-yellow-500" />
                    </div>
                    <p className="text-4xl font-black text-gray-900">{pendingTasks.length}</p>
                    <p className="text-xs text-gray-400 mt-1">{doneTasks.length} completed</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">All Projects</p>
                        <CalendarDays className="w-4 h-4 text-indigo-500" />
                    </div>
                    <p className="text-4xl font-black text-gray-900">{projects.length}</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {projects.filter((p: any) => p.deadline && new Date(p.deadline) < today).length > 0
                            ? `${projects.filter((p: any) => p.deadline && new Date(p.deadline) < today).length} overdue`
                            : 'All on track'}
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unread Messages</p>
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-4xl font-black text-gray-900">{unreadMessages}</p>
                    <p className="text-xs text-gray-400 mt-1">from Creative Manager / Elite</p>
                </div>
            </div>

            {/* ── KPI Score History bar chart ── */}
            {myScores.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                    <h2 className="text-sm font-semibold text-gray-900 flex items-center space-x-2 mb-4">
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                        <span>KPI Score History</span>
                    </h2>
                    <div className="flex items-end space-x-2 h-16">
                        {myScores.map((s: any, i: number) => {
                            const h = Math.max(8, (s.score / 100) * 64);
                            const color = s.score >= 75 ? '#22c55e' : s.score >= 50 ? '#eab308' : '#ef4444';
                            return (
                                <div key={s.id} className="flex flex-col items-center flex-1" title={`${s.form_title}: ${s.score}`}>
                                    <span className="text-[10px] text-gray-500 mb-1">{s.score}</span>
                                    <div className="w-full rounded-t-sm" style={{ height: h, backgroundColor: color, opacity: i === myScores.length - 1 ? 1 : 0.55 }} />
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                        <span>{myScores[0]?.form_title?.slice(0, 24)}</span>
                        <span>Latest → {myScores[myScores.length - 1]?.form_title?.slice(0, 24)}</span>
                    </div>
                </div>
            )}

            {/* ── Project Timeline & Gantt ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                        <CalendarDays className="w-5 h-5 text-indigo-500" />
                        <span>Project Timeline & Deadlines</span>
                    </h2>
                    {projects.some((p: any) => p.deadline && new Date(p.deadline) < today) && (
                        <span className="flex items-center space-x-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-full font-medium">
                            <AlertCircle className="w-3 h-3" />
                            <span>Overdue projects</span>
                        </span>
                    )}
                </div>

                {projects.length > 0 ? (
                    <>
                        {/* Deadline countdown cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
                            {projects.map((p: any) => {
                                const dl = new Date(p.deadline);
                                const daysLeft = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                const overdue = daysLeft < 0;
                                const projectTasks = tasks.filter((t: any) => t.project_id === p.id);
                                const done = projectTasks.filter((t: any) => t.status === 'DONE').length;
                                const pct = projectTasks.length > 0 ? Math.round((done / projectTasks.length) * 100) : 0;
                                return (
                                    <div key={p.id} className={`p-4 rounded-xl border ${overdue ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-gray-50/40'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-sm font-semibold text-gray-900 truncate pr-2">{p.name}</p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                                overdue ? 'bg-red-100 text-red-700' :
                                                daysLeft <= 3 ? 'bg-orange-100 text-orange-700' :
                                                'bg-green-100 text-green-700'
                                            }`}>
                                                {overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                                            <div className={`h-1.5 rounded-full ${pct === 100 ? 'bg-green-500' : overdue ? 'bg-red-400' : 'bg-indigo-500'}`}
                                                style={{ width: `${pct}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                            <span>{done}/{projectTasks.length} my tasks</span>
                                            <span>{pct}% done</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            Due: {dl.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                        <span className={`inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                            p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                            p.status === 'ACTIVE' ? 'bg-indigo-100 text-indigo-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>{p.status}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Gantt chart */}
                        <div className="overflow-hidden rounded-xl border border-gray-100">
                            <GanttChart tasks={ganttTasks} />
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-gray-400">
                        <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No projects yet.</p>
                        <p className="text-xs mt-1">Projects will appear here with their deadlines.</p>
                    </div>
                )}
            </div>

            {/* ── Tasks + Work Submission ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Tasks Panel */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col min-h-[420px]">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                            <Briefcase className="w-5 h-5 text-indigo-500" />
                            <span>My Tasks</span>
                        </h2>
                        <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-1 rounded-full font-medium">{pendingTasks.length} Pending</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {tasks.length > 0 ? tasks.map((task: any) => {
                            const isDone = task.status === 'DONE';
                            const isInProgress = task.status === 'IN_PROGRESS';
                            const dueDate = task.due_date ? new Date(task.due_date) : null;
                            const isOverdue = dueDate && dueDate < today && !isDone;
                            return (
                                <div key={task.id}
                                    onClick={() => handleUpdateTaskStatus(task.id, task.status)}
                                    className={`group flex flex-col p-4 border rounded-xl hover:border-indigo-200 hover:bg-indigo-50/20 transition-all cursor-pointer ${isUpdatingTask[task.id] ? 'opacity-50 pointer-events-none' : ''} ${isDone ? 'opacity-60' : ''} ${isOverdue ? 'border-red-200 bg-red-50/20' : 'border-gray-100'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0 flex-1 pr-2">
                                            <p className={`text-sm font-semibold truncate ${isDone ? 'line-through text-gray-400' : isOverdue ? 'text-red-700' : 'text-gray-800'} group-hover:text-indigo-900`}>
                                                {task.title || (task.project_name ? task.project_name : `Task #${task.id}`)}
                                            </p>
                                            {task.description && (
                                                <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                                            )}
                                            <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-0.5">
                                                {task.assigned_by_name && (
                                                    <span className="text-[10px] text-gray-400">From: {task.assigned_by_name}</span>
                                                )}
                                                {dueDate && (
                                                    <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                                                        {isOverdue ? '⚠️ ' : ''}Due: {dueDate.toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ml-2 ${
                                            isDone ? 'bg-green-100 text-green-700' :
                                            isInProgress ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                            {isDone ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                            <span>{task.status.replace('_', ' ')}</span>
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1.5">Click to advance status</p>
                                </div>
                            );
                        }) : (
                            <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
                                <CheckCircle2 className="w-10 h-10 mb-2 opacity-30" />
                                <p className="text-sm">No tasks assigned yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Work Submission */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col min-h-[420px]">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2 mb-2">
                        <UploadCloud className="w-5 h-5 text-purple-500" />
                        <span>Submit Work</span>
                    </h2>
                    <p className="text-xs text-gray-500 mb-5">Upload a file or add a note for any project.</p>

                    <div className="flex-1 flex flex-col space-y-3">
                        <select value={projectId} onChange={e => setProjectId(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="" disabled>Select Project...</option>
                            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>

                        <input ref={fileInputRef} type="file" className="hidden"
                            onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                        <div onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center p-5 cursor-pointer">
                            {uploadFile ? (
                                <div className="flex items-center space-x-2">
                                    <span className="text-2xl">{uploadFile.type.startsWith('image') ? '🖼️' : uploadFile.type.startsWith('video') ? '🎬' : '📄'}</span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 truncate max-w-[180px]">{uploadFile.name}</p>
                                        <p className="text-xs text-gray-400">{(uploadFile.size / 1024).toFixed(0)} KB</p>
                                    </div>
                                    <button type="button" onClick={e => { e.stopPropagation(); setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                        className="text-red-400 hover:text-red-600 text-xl ml-2">&times;</button>
                                </div>
                            ) : (
                                <>
                                    <UploadCloud className="w-7 h-7 text-gray-400 mb-1" />
                                    <p className="text-sm font-medium text-gray-600">Click to upload</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Video, Image, or Document (max 50MB)</p>
                                </>
                            )}
                        </div>

                        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-gray-400"
                            placeholder="Add a note or description..." />

                        <button onClick={handleSubmitWork} disabled={isSubmitting || !projectId}
                            className="bg-indigo-600 text-white w-full py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-colors shadow-sm font-semibold text-sm mt-auto disabled:bg-indigo-300 disabled:cursor-not-allowed">
                            <UploadCloud className="w-4 h-4" />
                            <span>{isSubmitting ? 'Submitting...' : 'Submit Work'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Messages ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col min-h-[500px]">
                <div className="flex justify-between items-center mb-5 pb-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                        <MessageSquare className="w-5 h-5 text-indigo-500" />
                        <span>Messages from Creative Manager / Elite</span>
                    </h2>
                    {unreadMessages > 0 && (
                        <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full font-medium">
                            {unreadMessages} Unread
                        </span>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                    {questions.length > 0 ? questions.map((q: any) => {
                        const isFromAdmin = q.creator?.role?.toUpperCase() === 'ADMIN';
                        const senderName = q.creator?.name || (isFromAdmin ? 'Elite' : 'Creative Manager');
                        const roleLabel = q.creator?.role === 'ADMIN' ? 'Elite' : q.creator?.role === 'MANAGER' ? 'Creative Manager' : (q.creator?.role || 'Creative Manager');
                        const hasReplied = q.responses && q.responses.length > 0;
                        const replyFile = replyFiles[q.id];

                        return (
                            <div key={q.id} className="space-y-2">
                                {/* Incoming message bubble */}
                                <div className="flex items-end space-x-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mb-1 shadow-sm ${isFromAdmin ? 'bg-purple-100' : 'bg-blue-100'}`}>
                                        <span className={`font-bold text-xs ${isFromAdmin ? 'text-purple-700' : 'text-blue-700'}`}>{senderName.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div className="flex flex-col max-w-[80%]">
                                        <div className="flex items-baseline space-x-2 mb-1 ml-1">
                                            <span className="text-xs font-semibold text-gray-700">{senderName}</span>
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase ${isFromAdmin ? 'text-purple-700 bg-purple-50' : 'text-blue-700 bg-blue-50'}`}>{roleLabel}</span>
                                        </div>
                                        <div className={`p-3.5 rounded-2xl rounded-bl-sm border shadow-sm text-sm ${isFromAdmin ? 'bg-purple-50 border-purple-100 text-gray-800' : 'bg-blue-50 border-blue-100 text-gray-800'}`}>
                                            {q.question_text && <p>{q.question_text}</p>}
                                            {q.attachment_url && (
                                                <div className="mt-2">
                                                    {q.attachment_type === 'audio' ? (
                                                        <audio controls src={`${API_BASE_URL}${q.attachment_url}`} className="h-8 w-full mt-1" />
                                                    ) : q.attachment_type === 'image' ? (
                                                        <img src={`${API_BASE_URL}${q.attachment_url}`} alt="attachment" className="max-h-40 rounded-lg border mt-1" />
                                                    ) : (
                                                        <a href={`${API_BASE_URL}${q.attachment_url}`} target="_blank" rel="noopener noreferrer"
                                                            className="text-xs text-indigo-600 underline flex items-center space-x-1 mt-1">
                                                            <span>📄</span><span>View Attachment</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Reply bubbles */}
                                {q.responses?.map((r: any) => (
                                    <div key={r.id} className="flex flex-col items-end">
                                        <span className="text-[10px] text-gray-400 font-medium mr-1 mb-0.5">You</span>
                                        <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-sm text-sm max-w-[80%]">
                                            {r.response_text}
                                        </div>
                                    </div>
                                ))}

                                {/* Reply input */}
                                {!hasReplied && (
                                    <div className="ml-10 space-y-2">
                                        {replyFile && (
                                            <div className="flex items-center bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 text-xs">
                                                <span className="mr-1">{replyFile.type.startsWith('audio') ? '🎵' : '📄'}</span>
                                                <span className="text-indigo-700 truncate">{replyFile.name}</span>
                                                <button onClick={() => setReplyFiles(prev => ({ ...prev, [q.id]: null }))} className="ml-2 text-red-400">&times;</button>
                                            </div>
                                        )}
                                        <div className="flex items-center space-x-2">
                                            <input type="text"
                                                className="flex-1 border border-gray-200 bg-gray-50 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                                                placeholder={`Reply to ${senderName}...`}
                                                value={replies[q.id] || ''}
                                                onChange={e => setReplies(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                onKeyDown={e => { if (e.key === 'Enter') handleReply(q.id); }}
                                            />
                                            <label className="cursor-pointer text-gray-400 hover:text-indigo-600 p-2">
                                                <input type="file" className="hidden"
                                                    onChange={e => setReplyFiles(prev => ({ ...prev, [q.id]: e.target.files?.[0] || null }))} />
                                                <Paperclip className="w-4 h-4" />
                                            </label>
                                            <button type="button" onClick={() => handleToggleRecording(q.id)}
                                                className={`p-2 rounded-full transition-colors ${isRecording[q.id] ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:text-indigo-600'}`}>
                                                {isRecording[q.id] ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => handleReply(q.id)}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-full shadow-sm">
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                            <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
                            <p className="text-base font-medium text-gray-900">No Messages Yet</p>
                            <p className="text-sm text-gray-500 mt-1">Messages from your Creative Manager or Elite will appear here.</p>
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 20px; }
            `}} />
        </div>
    );
}
