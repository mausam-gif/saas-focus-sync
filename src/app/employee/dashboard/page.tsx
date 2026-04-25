"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    UploadCloud, CheckCircle2, Clock, MessageSquare, Briefcase,
    TrendingUp, AlertCircle, Send, Paperclip, Mic, MicOff,
    CalendarDays, BarChart2, FileText, X, ExternalLink, Download,
    Globe, MapPin, Instagram, Facebook, Play, File as FileIcon, Loader2
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
    const [kpiMetrics, setKpiMetrics] = useState<any>(null);

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
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [showFullGantt, setShowFullGantt] = useState(false);
    const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
    const [completionNotes, setCompletionNotes] = useState('');
    const [viewTaskId, setViewTaskId] = useState<number | null>(null);

    // ── Data loading ────────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        if (!user) return;
        const [tasksRes, questionsRes, projectsRes, scoresRes, assignmentsRes, analyticsRes] = await Promise.allSettled([
            api.get('tasks/'),
            api.get('questions/'),
            api.get('projects/'),
            api.get('kpi-forms/scores/me'),
            api.get('kpi-forms/my-forms'),
            api.get('analytics/'),
        ]);
        if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value.data);
        if (questionsRes.status === 'fulfilled') setQuestions(questionsRes.value.data);
        if (projectsRes.status === 'fulfilled') setProjects(projectsRes.value.data);
        if (scoresRes.status === 'fulfilled') setMyScores(scoresRes.value.data);
        if (assignmentsRes.status === 'fulfilled') {
            setPendingForms(assignmentsRes.value.data.filter((a: any) => !a.is_submitted).length);
        }
        if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data.length > 0) {
            setKpiMetrics(analyticsRes.value.data[0]);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (user && !authLoading) loadData();
    }, [user, authLoading, router, loadData]);

    if (authLoading || !user) return null;

    // ── Derived values ──────────────────────────────────────────────────────────
    const today = new Date();
    const latestScore = kpiMetrics?.productivity_score ?? (myScores.length > 0 ? myScores[myScores.length - 1].score : null);
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
                const res = await api.post('upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                fileUrl = `${API_BASE_URL}${res.data.url}`;
            }
            await api.post('submissions/', { project_id: parseInt(projectId), file_url: fileUrl, comment });
            loadData();
            setUploadFile(null);
            setComment('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) {
            alert('Failed to submit: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateTaskStatus = async (taskId: number, currentStatus: string, notes?: string) => {
        const statuses = ['TODO', 'IN_PROGRESS', 'DONE'];
        const currentIndex = statuses.indexOf(currentStatus);
        const nextStatus = statuses[(currentIndex + 1) % statuses.length];

        // If moving to DONE, we need notes (optional but prompted)
        if (nextStatus === 'DONE' && !notes && notes !== '') {
            setCompletingTaskId(taskId);
            setCompletionNotes('');
            return;
        }

        setIsUpdatingTask(prev => ({ ...prev, [taskId]: true }));
        try {
            await api.put(`tasks/${taskId}`, { 
                status: nextStatus,
                completion_notes: notes || undefined 
            });
            loadData();
            setCompletingTaskId(null);
            if (viewTaskId === taskId && nextStatus === 'DONE') {
                setViewTaskId(null); // optionally close modal on completion
            }
        } catch (err: any) { alert('Failed to update task: ' + (err.response?.data?.detail || err.message)); }
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
                const res = await api.post('upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                attachmentUrl = res.data.url;
                attachmentType = res.data.type;
            }
            await api.post(`questions/${questionId}/responses`, {
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
                    <div className="flex items-center space-x-3">
                        {projects.some((p: any) => p.deadline && new Date(p.deadline) < today) && (
                            <span className="flex items-center space-x-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-full font-medium">
                                <AlertCircle className="w-3 h-3" />
                                <span>Overdue projects</span>
                            </span>
                        )}
                        <button 
                            onClick={() => setShowFullGantt(true)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors flex items-center space-x-1.5"
                        >
                            <BarChart2 className="w-3 h-3" />
                            <span>View All</span>
                        </button>
                    </div>
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
                                    <div key={p.id} 
                                        onClick={() => setSelectedProject(p)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:border-indigo-300 ${overdue ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-gray-50/40'}`}>
                                        <div className="flex items-center space-x-3 mb-3">
                                            {p.logo_url ? (
                                                <div className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm flex-shrink-0">
                                                    <img src={`${API_BASE_URL}${p.logo_url}`} alt="Project Logo" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                    <Briefcase className="w-5 h-5 text-indigo-600" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-bold text-gray-900 truncate pr-1">{p.name}</p>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${
                                                        overdue ? 'bg-red-100 text-red-700' :
                                                        daysLeft <= 3 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                        {overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                                            <div className={`h-1.5 rounded-full ${pct === 100 ? 'bg-green-500' : overdue ? 'bg-red-400' : 'bg-indigo-500'}`}
                                                style={{ width: `${pct}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                            <span>{done}/{projectTasks.length} my tasks</span>
                                            <span>{pct}% done</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <p className="text-[10px] text-gray-400">
                                                Due: {dl.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                            <span className="text-[10px] text-indigo-600 font-semibold group-hover:underline flex items-center">
                                                View Info <ExternalLink className="w-2.5 h-2.5 ml-1" />
                                            </span>
                                        </div>
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
                    <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar max-h-[450px]">
                        {tasks.length > 0 ? (
                            Object.entries(tasks.reduce((acc: { [key: string]: any[] }, task: any) => {
                                const projectName = task.project_name || 'General Tasks';
                                if (!acc[projectName]) acc[projectName] = [];
                                acc[projectName].push(task);
                                return acc;
                            }, {})).map(([projectName, projectTasks]: [string, any]) => (
                                <div key={projectName} className="space-y-3">
                                    <div className="flex items-center space-x-2 bg-gray-50/50 py-1 px-2 rounded-lg sticky top-0 z-10 backdrop-blur-sm">
                                        <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{projectName}</h3>
                                        <span className="text-[10px] bg-gray-200/50 text-gray-500 px-1.5 py-0.5 rounded-md font-bold">{projectTasks.length}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {projectTasks.map((task: any) => {
                                            const isDone = task.status === 'DONE';
                                            const isInProgress = task.status === 'IN_PROGRESS';
                                            const dueDate = task.due_date ? new Date(task.due_date) : null;
                                            const isOverdue = dueDate && dueDate < today && !isDone;
                                            return (
                                                <div key={task.id}
                                                    onClick={() => setViewTaskId(task.id)}
                                                    className={`group flex flex-col p-4 border rounded-xl hover:border-indigo-200 hover:bg-indigo-50/20 transition-all cursor-pointer ${isUpdatingTask[task.id] ? 'opacity-50 pointer-events-none' : ''} ${isDone ? 'opacity-60' : ''} ${isOverdue ? 'border-red-200 bg-red-50/20' : 'border-gray-100'}`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="min-w-0 flex-1 pr-2">
                                                            <p className={`text-sm font-semibold truncate ${isDone ? 'line-through text-gray-400' : isOverdue ? 'text-red-700' : 'text-gray-800'} group-hover:text-indigo-900`}>
                                                                {task.title || `Task #${task.id}`}
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
                                                        <div className="flex flex-col items-end space-y-2 flex-shrink-0 ml-2">
                                                            <span className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                                                                isDone ? 'bg-green-100 text-green-700' :
                                                                isInProgress ? 'bg-blue-100 text-blue-700' :
                                                                'bg-gray-100 text-gray-600'
                                                            }`}>
                                                                {isDone ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                                <span>{task.status.replace('_', ' ')}</span>
                                                            </span>
                                                            
                                                            {!isDone && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task.id, task.status); }}
                                                                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors flex items-center shadow-sm border border-indigo-100"
                                                                >
                                                                    Advance <Play className="w-2.5 h-2.5 ml-1" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
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
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-black">
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
                            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-gray-600 text-black"
                            placeholder="Add a note or description..." />

                        <button onClick={handleSubmitWork} disabled={isSubmitting || !projectId}
                            className="bg-indigo-600 text-white w-full py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-colors shadow-sm font-semibold text-sm mt-auto disabled:bg-indigo-300 disabled:cursor-not-allowed">
                            <UploadCloud className="w-4 h-4" />
                            <span>{isSubmitting ? 'Submitting...' : 'Submit Work'}</span>
                        </button>
                    </div>
                </div>
            </div>


            {/* Project Detail Modal */}
            {selectedProject && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/30">
                            <div className="flex items-center space-x-4 text-gray-900 font-bold text-xl">
                                {selectedProject.logo_url ? (
                                    <div className="w-12 h-12 rounded-xl border border-indigo-100 overflow-hidden bg-white shadow-sm flex-shrink-0">
                                        <img src={`${API_BASE_URL}${selectedProject.logo_url}`} alt="Project Logo" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <Briefcase className="w-6 h-6 text-indigo-600" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{selectedProject.name}</h3>
                                    <p className="text-sm text-indigo-600 font-medium mt-0.5">{selectedProject.service_category || 'Creative Project'}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Status</p>
                                    <span className="text-sm font-semibold text-indigo-700">{selectedProject.status}</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Budget (NPR)</p>
                                    <span className="text-sm font-semibold text-gray-900">{selectedProject.total_budget?.toLocaleString() || 'N/A'}</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Deadline</p>
                                    <span className="text-sm font-semibold text-gray-900">{new Date(selectedProject.deadline).toLocaleDateString()}</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Delivery</p>
                                    <span className="text-sm font-semibold text-green-700">{selectedProject.delivery_date ? new Date(selectedProject.delivery_date).toLocaleDateString() : 'TBD'}</span>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Col: Specs */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 flex items-center mb-3">
                                            <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" />
                                            Core Specifications
                                        </h4>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 mb-1">Value Proposition</p>
                                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                                                    "{selectedProject.client_value_proposition || 'Not specified'}"
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 mb-1">The "Hook"</p>
                                                <p className="text-sm text-gray-700 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 font-medium">
                                                    {selectedProject.the_hook || 'Seeking the perfect hook...'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 mb-1">Problem Solved</p>
                                                <p className="text-sm text-gray-700">{selectedProject.problem_solved || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {selectedProject.client && (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center mb-3">
                                                <Globe className="w-4 h-4 mr-2 text-blue-500" />
                                                Client Profile
                                            </h4>
                                            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                                <div className="flex items-center space-x-3 mb-4">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <span className="text-blue-700 font-bold">{selectedProject.client.business_name.charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{selectedProject.client.business_name}</p>
                                                        <p className="text-[10px] text-gray-500 flex items-center">
                                                            <MapPin className="w-2.5 h-2.5 mr-1" /> {selectedProject.client.location || 'Nepal'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2">
                                                    {selectedProject.client.facebook_url && (
                                                        <a href={selectedProject.client.facebook_url} target="_blank" rel="noreferrer" className="p-2 bg-gray-50 hover:bg-blue-50 rounded-lg group transition-colors">
                                                            <Facebook className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                                                        </a>
                                                    )}
                                                    {selectedProject.client.instagram_url && (
                                                        <a href={selectedProject.client.instagram_url} target="_blank" rel="noreferrer" className="p-2 bg-gray-50 hover:bg-pink-50 rounded-lg group transition-colors">
                                                            <Instagram className="w-4 h-4 text-gray-400 group-hover:text-pink-600" />
                                                        </a>
                                                    )}
                                                    {selectedProject.client.tiktok_url && (
                                                        <a href={selectedProject.client.tiktok_url} target="_blank" rel="noreferrer" className="p-2 bg-gray-50 hover:bg-black rounded-lg group transition-colors">
                                                            <Play className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Col: Document Vault */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center mb-3">
                                        <Paperclip className="w-4 h-4 mr-2 text-purple-500" />
                                        Document Vault
                                    </h4>
                                    <div className="space-y-3">
                                        {/* Client Shared Documents */}
                                        {selectedProject.client?.documents?.map((doc: any) => (
                                            <a key={doc.id} href={`${API_BASE_URL}${doc.file_url}`} target="_blank" rel="noreferrer"
                                                className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/10 transition-all group">
                                                <div className="flex items-center space-x-3 overflow-hidden">
                                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                                        <FileIcon className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-xs font-semibold text-gray-800 truncate">{doc.file_name}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Client Document</p>
                                                    </div>
                                                </div>
                                                <Download className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                            </a>
                                        ))}
                                        
                                        {/* Project Handover Documents */}
                                        {selectedProject.documents?.map((doc: any) => (
                                            <a key={`proj-${doc.id}`} href={`${API_BASE_URL}${doc.file_url}`} target="_blank" rel="noreferrer"
                                                className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/10 transition-all group">
                                                <div className="flex items-center space-x-3 overflow-hidden">
                                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                                        <FileIcon className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-xs font-semibold text-gray-800 truncate">{doc.file_name}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Project Foundation</p>
                                                    </div>
                                                </div>
                                                <Download className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                            </a>
                                        ))}

                                        {/* Team Submissions */}
                                        {selectedProject.work_submissions?.map((sub: any) => (
                                            <a key={sub.id} href={`${API_BASE_URL}${sub.file_url}`} target="_blank" rel="noreferrer" download
                                                className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-purple-200 hover:bg-purple-50/10 transition-all group">
                                                <div className="flex items-center space-x-3 overflow-hidden">
                                                    <div className="p-2 bg-purple-50 rounded-lg">
                                                        <UploadCloud className="w-4 h-4 text-purple-600" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-xs font-semibold text-gray-800 truncate">{sub.comment || 'Work Submission'}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Team Work • {new Date(sub.timestamp).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <Download className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors" />
                                            </a>
                                        ))}

                                        {(!selectedProject.client?.documents?.length && !selectedProject.work_submissions?.length && !selectedProject.documents?.length) && (
                                            <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                                                <Paperclip className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                                <p className="text-xs text-gray-400">No documents shared yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                            <button onClick={() => setSelectedProject(null)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 px-8 py-2">
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Gantt Chart Modal */}
            {showFullGantt && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/30">
                            <div className="flex items-center space-x-3">
                                <CalendarDays className="w-6 h-6 text-indigo-500" />
                                <h3 className="text-xl font-bold text-gray-900">Project Timeline (Gantt View)</h3>
                            </div>
                            <button onClick={() => setShowFullGantt(false)} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
                            <div className="min-w-[800px] bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                <GanttChart tasks={ganttTasks} />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                            <p className="text-xs text-gray-500 italic ml-4">Scroll horizontally to view the full timeline if needed.</p>
                            <button onClick={() => setShowFullGantt(false)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 px-8 py-2">
                                Close Timeline
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 20px; }
            `}} />

            {/* Completion Notes Modal */}
            {completingTaskId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                        <div className="flex items-center space-x-2 text-indigo-600">
                            <CheckCircle2 className="w-6 h-6" />
                            <h3 className="text-lg font-bold">Complete Task</h3>
                        </div>
                        <p className="text-sm text-gray-500">
                            Great job! Optionally, add any final notes or a brief description of the work done before marking this as completed.
                        </p>
                        <textarea
                            value={completionNotes}
                            onChange={e => setCompletionNotes(e.target.value)}
                            placeholder="e.g. Uploaded all assets, fixed the minor bug in footer..."
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32 placeholder-gray-400 text-black placeholder:italic"
                        />
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setCompletingTaskId(null)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const task = tasks.find((t: any) => t.id === completingTaskId);
                                    if (task) handleUpdateTaskStatus(task.id, task.status, completionNotes);
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-md"
                            >
                                Mark as Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TASK DETAILS MODAL */}
            {viewTaskId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-all" onClick={() => setViewTaskId(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        {(() => {
                            const task = tasks.find((t: any) => t.id === viewTaskId);
                            if (!task) return null;
                            const isDone = task.status === 'DONE';
                            return (
                                <>
                                    <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-2 rounded-xl ${
                                                task.status === 'DONE' ? 'bg-green-100 text-green-600' :
                                                task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600' :
                                                'bg-gray-100 text-gray-500'
                                            }`}>
                                                {task.status === 'DONE' ? <CheckCircle2 className="w-5 h-5" /> : 
                                                 task.status === 'IN_PROGRESS' ? <Clock className="w-5 h-5 animate-pulse" /> : <AlertCircle className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 leading-tight">{task.title}</h3>
                                                <p className="text-xs text-gray-500 mt-0.5">{task.project_name || 'General Task'}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setViewTaskId(null)} className="p-2 -mr-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-full transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="px-6 py-5 space-y-6">
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
                                            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">{task.description || "No description provided."}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <span className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                    <Briefcase className="w-3 h-3 mr-1" /> Assigned By
                                                </span>
                                                <p className="text-sm font-semibold text-gray-900">{task.assigned_by_name || `Admin`}</p>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <span className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                    <CalendarDays className="w-3 h-3 mr-1" /> Due Date
                                                </span>
                                                <p className={`text-sm font-semibold ${task.due_date && new Date(task.due_date) < new Date() && task.status !== 'DONE' ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'None'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Started At</span>
                                                <p className="text-xs font-medium text-gray-800">{task.started_at ? new Date(task.started_at).toLocaleString() : 'Not started'}</p>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Completed At</span>
                                                <p className="text-xs font-medium text-gray-800">{task.completed_at ? new Date(task.completed_at).toLocaleString() : 'Not completed'}</p>
                                            </div>
                                        </div>

                                        {task.completed_at && (
                                            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Total Duration</span>
                                                <span className="text-sm font-bold text-indigo-700">
                                                    {(() => {
                                                        const start = new Date(task.started_at || task.created_at);
                                                        const end = new Date(task.completed_at);
                                                        const diff = Math.max(0, end.getTime() - start.getTime());
                                                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                                        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                                                        const mins = Math.floor((diff / (1000 * 60)) % 60);
                                                        return `${days > 0 ? days + 'd ' : ''}${hours}h ${mins}m`;
                                                    })()}
                                                </span>
                                            </div>
                                        )}

                                        {task.completion_notes && (
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Completion Notes</h4>
                                                <div className="text-sm text-gray-700 bg-green-50/50 p-3 rounded-lg border border-green-100 italic">
                                                    "{task.completion_notes}"
                                                </div>
                                            </div>
                                        )}

                                        {/* Action inside modal */}
                                        {!isDone && (
                                            <div className="pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task.id, task.status); }}
                                                    disabled={isUpdatingTask[task.id]}
                                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-md shadow-indigo-200 transition-all flex justify-center items-center disabled:opacity-50"
                                                >
                                                    {isUpdatingTask[task.id] ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                                                    {task.status === 'TODO' ? 'Start Task' : 'Mark as Done'}
                                                </button>
                                                <p className="text-[10px] text-center text-gray-400 mt-2 flex items-center justify-center">
                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                    Status progression cannot be undone.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
