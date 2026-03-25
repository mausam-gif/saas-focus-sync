"use client";
import React from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api, API_BASE_URL } from '@/lib/api';
import { GanttChart } from '@/components/GanttChart';
import {
    Plus, Search, Filter, Shield, MoreVertical, Trash2, Edit, CheckCircle, CheckCircle2,
    User, Send, MessageSquare, Briefcase, Calendar, BarChart2, TrendingUp, Clock,
    Users, ChartBar, Loader2, ClipboardList, UploadCloud, AlertCircle
} from 'lucide-react';

export default function ManagerDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [team, setTeam] = React.useState<any[]>([]);
    const [stats, setStats] = React.useState({ productivity: 0, completion: 0, efficiency: 0 });
    const [selectedEmployee, setSelectedEmployee] = React.useState<string>("");
    const [questionText, setQuestionText] = React.useState<string>("");
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [isSending, setIsSending] = React.useState(false);
    const [questions, setQuestions] = React.useState<any[]>([]);
    const [kpiAnalytics, setKpiAnalytics] = React.useState<any>(null);
    const [kpiView, setKpiView] = React.useState<'team' | 'employee'>('team');
    const [kpiSelectedId, setKpiSelectedId] = React.useState<number | null>(null);
    // Attachment state for Check-in
    const [attachment, setAttachment] = React.useState<File | null>(null);
    const [mediaRecorder, setMediaRecorder] = React.useState<MediaRecorder | null>(null);
    const [isRecording, setIsRecording] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    // Task Assignment state
    const [taskTitle, setTaskTitle] = React.useState('');
    const [taskDesc, setTaskDesc] = React.useState('');
    const [taskAssignTo, setTaskAssignTo] = React.useState('');
    const [taskDueDate, setTaskDueDate] = React.useState('');
    const [taskProjects, setTaskProjects] = React.useState<any[]>([]);
    const [taskProjectId, setTaskProjectId] = React.useState('');
    const [isSendingTask, setIsSendingTask] = React.useState(false);
    const [sentTasks, setSentTasks] = React.useState<any[]>([]);
    const [editTaskId, setEditTaskId] = React.useState<number | null>(null);
    const [editTaskForm, setEditTaskForm] = React.useState({ title: '', status: '' });
    const [isSavingTaskEdit, setIsSavingTaskEdit] = React.useState(false);
    const [myPersonalTasks, setMyPersonalTasks] = React.useState<any[]>([]);
    const [allProjects, setAllProjects] = React.useState<any[]>([]);
    
    // Work Submission state
    const [submitProjectId, setSubmitProjectId] = React.useState<string>('');
    const [submitComment, setSubmitComment] = React.useState('');
    const [isSubmittingWork, setIsSubmittingWork] = React.useState(false);
    const [uploadFile, setUploadFile] = React.useState<File | null>(null);
    const workFileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (user && !authLoading) {
            api.get('/users/').then(res => setTeam(res.data.filter((u: any) => u.id !== user.id)));
            const roleMap: Record<string, string> = { 'ADMIN': 'Elite', 'MANAGER': 'Creative Manager', 'EMPLOYEE': 'Elite Member' };
            api.get('/analytics/').then(res => {
                const kpis = res.data;
                if (kpis.length > 0) {
                    const avgProd = kpis.reduce((acc: any, curr: any) => acc + curr.productivity_score, 0) / kpis.length;
                    const avgComp = kpis.reduce((acc: any, curr: any) => acc + curr.task_completion_rate, 0) / kpis.length;
                    const avgEff = kpis.reduce((acc: any, curr: any) => acc + curr.efficiency_score, 0) / kpis.length;
                    setStats({ productivity: avgProd, completion: avgComp, efficiency: avgEff });
                }
            });
            api.get('/kpi-forms/analytics/overview').then(res => setKpiAnalytics(res.data)).catch(() => { });
            api.get('/questions/').then(res => setQuestions(res.data));
            api.get('/projects/').then(res => {
                setTaskProjects(res.data);
                setAllProjects(res.data);
            });
            api.get('/tasks/').then(res => {
                setSentTasks(res.data);
                // Filter tasks assigned TO me
                setMyPersonalTasks(res.data.filter((t: any) => t.assigned_user === user.id));
            });
        }
    }, [user, authLoading, router]);

    const handleGenerateQuestion = async () => {
        if (!selectedEmployee) return alert("Please select an employee first.");
        setIsGenerating(true);
        try {
            const res = await api.post(`/questions/generate/${selectedEmployee}`);
            setQuestionText(res.data.question_text);
        } catch (error) {
            console.error(error);
            alert("Failed to generate question.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendQuestion = async () => {
        if (!selectedEmployee) return alert("Please select an employee.");
        if (!questionText && !attachment) return alert("Please write a message or attach a file.");
        setIsSending(true);
        try {
            let attachmentUrl: string | null = null;
            let attachmentType: string | null = null;
            if (attachment) {
                const formData = new FormData();
                formData.append('file', attachment);
                const uploadRes = await api.post('/upload/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                attachmentUrl = uploadRes.data.url;
                attachmentType = uploadRes.data.type;
            }
            await api.post('/questions/', {
                target_employee: parseInt(selectedEmployee),
                question_text: questionText || null,
                attachment_url: attachmentUrl,
                attachment_type: attachmentType,
            });
            setQuestionText("");
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            const res = await api.get('/questions/');
            setQuestions(res.data);
        } catch (err: any) {
            alert('Failed to send: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsSending(false);
        }
    };

    if (authLoading || !user) return null;

    // Task assignment handler
    const handleAssignTask = async () => {
        if (!taskTitle.trim()) return alert('Please enter a task title.');
        if (!taskAssignTo) return alert('Please select an employee.');
        setIsSendingTask(true);
        try {
            await api.post('/tasks/', {
                title: taskTitle,
                description: taskDesc || null,
                assigned_user: parseInt(taskAssignTo),
                project_id: taskProjectId ? parseInt(taskProjectId) : null,
                due_date: taskDueDate || null,
            });
            setTaskTitle(''); setTaskDesc(''); setTaskAssignTo('');
            setTaskDueDate(''); setTaskProjectId('');
            const res = await api.get('/tasks/');
            setSentTasks(res.data);
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        } finally { setIsSendingTask(false); }
    };

    const handleEditTaskSave = async (taskId: number) => {
        setIsSavingTaskEdit(true);
        try {
            await api.put(`/tasks/${taskId}`, { title: editTaskForm.title || undefined, status: editTaskForm.status || undefined });
            setEditTaskId(null);
            const res = await api.get('/tasks/');
            setSentTasks(res.data);
        } catch (err: any) { alert('Failed: ' + (err.response?.data?.detail || err.message)); }
        finally { setIsSavingTaskEdit(false); }
    };

    const handleDeleteTask = async (taskId: number) => {
        try {
            await api.delete(`/tasks/${taskId}`);
            setSentTasks(prev => prev.filter((t: any) => t.id !== taskId));
        } catch (err: any) { alert('Failed: ' + (err.response?.data?.detail || err.message)); }
    };

    const handleUpdateTaskStatus = async (taskId: number, currentStatus: string) => {
        const statuses = ['TODO', 'IN_PROGRESS', 'DONE'];
        const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
        try {
            await api.put(`/tasks/${taskId}`, { status: nextStatus });
            const res = await api.get('/tasks/');
            setSentTasks(res.data);
            setMyPersonalTasks(res.data.filter((t: any) => t.assigned_user === user.id));
        } catch { alert('Failed to update task.'); }
    };

    const handleSubmitWork = async () => {
        if (!submitProjectId) return alert('Please select a project.');
        if (!uploadFile && !submitComment) return alert('Please attach a file or add a comment.');
        setIsSubmittingWork(true);
        try {
            let fileUrl = '';
            if (uploadFile) {
                const formData = new FormData();
                formData.append('file', uploadFile);
                const res = await api.post('/upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                fileUrl = `${API_BASE_URL}${res.data.url}`;
            }
            await api.post('/submissions/', { project_id: parseInt(submitProjectId), file_url: fileUrl, comment: submitComment });
            setUploadFile(null);
            setSubmitComment('');
            if (workFileInputRef.current) workFileInputRef.current.value = '';
            alert('Work submitted successfully!');
        } catch (err: any) {
            alert('Failed to submit: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsSubmittingWork(false);
        }
    };

    const today = new Date();
    const ganttTasks = allProjects.map((p: any) => {
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

    return (
        <div className="p-4 sm:p-8 font-sans max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Team Overview</h1>
                <p className="text-sm text-gray-500 mt-1">Monitor progress and unblock your team members.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {[
                    { title: "Team Members", value: team.length.toString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                    { title: "Avg Completion", value: `${Math.round(stats.completion)}%`, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
                    { title: "Avg Efficiency", value: `${Math.round(stats.efficiency)}%`, icon: ChartBar, color: "text-purple-600", bg: "bg-purple-50" },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
                                    <h3 className="text-3xl font-semibold text-gray-900">{stat.value}</h3>
                                </div>
                                <div className={`p-3 rounded-full ${stat.bg}`}>
                                    <Icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8">
                {/* ── Project Timeline & Gantt ── */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                            <Calendar className="w-5 h-5 text-indigo-500" />
                            <span>Project Timeline & Deadlines</span>
                        </h2>
                        {allProjects.some((p: any) => p.deadline && new Date(p.deadline) < today) && (
                            <span className="flex items-center space-x-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-full font-medium">
                                <AlertCircle className="w-3 h-3" />
                                <span>Overdue projects</span>
                            </span>
                        )}
                    </div>

                    {allProjects.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-gray-100">
                            <GanttChart tasks={ganttTasks} />
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">No projects yet.</p>
                        </div>
                    )}
                </div>

                {/* KPI Panel - Forms-Driven Swappable */}
                <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col">
                    <div className="mb-4">
                        <h2 className="text-base font-semibold text-gray-900 mb-3">Team KPI Performance</h2>
                        <p className="text-xs text-gray-500 mb-3">Based on KPI form submissions.</p>
                        {/* View Toggle */}
                        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                            {([['team', Users, 'My Team'], ['employee', User, 'Employee']] as [string, any, string][]).map(([key, Icon, label]) => (
                                <button key={key} onClick={() => { setKpiView(key as 'team' | 'employee'); setKpiSelectedId(null); }}
                                    className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${kpiView === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}>
                                    <Icon className="w-3 h-3" /><span>{key === 'employee' ? 'Elite Member' : label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Team View */}
                    {kpiView === 'team' && (
                        <div className="space-y-3">
                            {!kpiAnalytics || kpiAnalytics.all_employees?.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-gray-400">No form submissions yet.</p>
                                    <p className="text-xs text-gray-300 mt-1">Assign KPI forms to see scores here.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Team Summary stat */}
                                    {(() => {
                                        const teamScores = kpiAnalytics.all_employees?.filter((e: any) =>
                                            team.some(t => t.id === e.employee_id)
                                        ) || [];
                                        const teamAvg = teamScores.length > 0
                                            ? Math.round(teamScores.reduce((s: number, e: any) => s + e.average_score, 0) / teamScores.length) : 0;
                                        return (
                                            <div className="flex space-x-3 mb-4">
                                                <div className="flex-1 text-center p-3 bg-indigo-50 rounded-xl">
                                                    <p className="text-2xl font-black text-indigo-600">{teamAvg}</p>
                                                    <p className="text-xs text-gray-500">Team Average</p>
                                                </div>
                                                <div className="flex-1 text-center p-3 bg-green-50 rounded-xl">
                                                    <p className="text-2xl font-black text-green-600">{kpiAnalytics.completion_rate}%</p>
                                                    <p className="text-xs text-gray-500">Completion</p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    {/* Employee score bars */}
                                    <div className="space-y-2">
                                        {team.map(emp => {
                                            const score = kpiAnalytics.all_employees?.find((e: any) => e.employee_id === emp.id);
                                            return (
                                                <div key={emp.id} className="flex items-center space-x-3">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-600 mb-1">{emp.name.split(' ')[0]}</p>
                                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                                            {score && <div className={`h-2 rounded-full ${score.average_score >= 75 ? 'bg-green-500' : score.average_score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                                                style={{ width: `${score.average_score}%` }} />}
                                                        </div>
                                                    </div>
                                                    <span className={`text-xs font-bold w-8 text-right ${score ? (score.average_score >= 75 ? 'text-green-600' : score.average_score >= 50 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-300'
                                                        }`}>{score ? score.average_score : '—'}</span>
                                                </div>
                                            );
                                        })}
                                        {team.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No team members found.</p>}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Employee View */}
                    {kpiView === 'employee' && (
                        <div className="space-y-3">
                            <select value={kpiSelectedId ?? ''} onChange={e => setKpiSelectedId(parseInt(e.target.value) || null)}
                                className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2 text-sm outline-none">
                                <option value="">Select an Elite Member...</option>
                                {team.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            {kpiSelectedId && (() => {
                                const score = kpiAnalytics?.all_employees?.find((e: any) => e.employee_id === kpiSelectedId);
                                const emp = team.find(e => e.id === kpiSelectedId);
                                return (
                                    <div className="space-y-3">
                                        <div className="text-center p-4 bg-purple-50 rounded-xl">
                                            <p className={`text-4xl font-black ${score ? (score.average_score >= 75 ? 'text-green-600' : score.average_score >= 50 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-300'
                                                }`}>{score ? score.average_score : '—'}</p>
                                            <p className="text-xs text-gray-500 mt-1">{emp?.name}'s KPI Score</p>
                                            {score && <p className="text-xs text-gray-400">{score.submissions_count} form(s) submitted</p>}
                                        </div>
                                        {score ? (
                                            <>
                                                <div className="w-full bg-gray-100 rounded-full h-3">
                                                    <div className={`h-3 rounded-full transition-all ${score.average_score >= 75 ? 'bg-green-500' : score.average_score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                                        style={{ width: `${score.average_score}%` }} />
                                                </div>
                                                <p className={`text-center text-sm font-semibold ${score.average_score >= 75 ? 'text-green-600' : score.average_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                                                    }`}>
                                                    {score.average_score >= 75 ? '✅ High Performer' : score.average_score >= 50 ? '⚠️ Average Performance' : '🔴 Needs Attention'}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-gray-400 text-center">No form submissions yet.</p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Assign Task Panel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 sm:p-6 flex flex-col">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2 mb-1">
                        <ClipboardList className="w-5 h-5 text-indigo-500" />
                        <span>Assign Task</span>
                    </h2>
                    <p className="text-xs text-gray-500 mb-4">Send a task directly to an Elite Member.</p>
                    <div className="flex-1 flex flex-col space-y-3">
                        <select value={taskAssignTo} onChange={e => setTaskAssignTo(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="" disabled>Assign to Elite Member...</option>
                            {team.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                            placeholder="Task title (required)"
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} rows={2}
                            placeholder="Description (optional)"
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                                <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Link to Project</label>
                                <select value={taskProjectId} onChange={e => setTaskProjectId(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">None</option>
                                    {taskProjects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <button onClick={handleAssignTask} disabled={isSendingTask || !taskTitle || !taskAssignTo}
                            className="bg-indigo-600 text-white w-full py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-colors font-semibold text-sm disabled:bg-indigo-300 disabled:cursor-not-allowed mt-auto">
                            <Send className="w-4 h-4" />
                            <span>{isSendingTask ? 'Assigning...' : 'Assign Task'}</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2 mb-4">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span>Assigned Tasks</span>
                        <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{sentTasks.length} total</span>
                    </h2>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: 320 }}>
                        {sentTasks.length > 0 ? sentTasks.map((t: any) => (
                            <div key={t.id} className="group border border-gray-100 rounded-xl hover:border-indigo-100 transition-all">
                                {editTaskId === t.id ? (
                                    <div className="p-3 space-y-2">
                                        <input value={editTaskForm.title} onChange={e => setEditTaskForm(f => ({ ...f, title: e.target.value }))}
                                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        <select value={editTaskForm.status} onChange={e => setEditTaskForm(f => ({ ...f, status: e.target.value }))}
                                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
                                            <option value="TODO">TODO</option>
                                            <option value="IN_PROGRESS">IN PROGRESS</option>
                                            <option value="DONE">DONE</option>
                                        </select>
                                        <div className="flex space-x-2">
                                            <button onClick={() => setEditTaskId(null)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-1.5 text-xs font-medium hover:bg-gray-50">Cancel</button>
                                            <button onClick={() => handleEditTaskSave(t.id)} disabled={isSavingTaskEdit} className="flex-1 bg-indigo-600 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-indigo-700 disabled:bg-indigo-300">{isSavingTaskEdit ? 'Saving…' : 'Save'}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start justify-between p-3">
                                        <div className="min-w-0 flex-1 pr-2">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{t.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">→ {t.assigned_user_name || `User #${t.assigned_user}`}</p>
                                            {t.due_date && <p className="text-[10px] text-gray-400 mt-0.5">Due: {new Date(t.due_date).toLocaleDateString()}</p>}
                                        </div>
                                        <div className="flex items-center space-x-1 flex-shrink-0">
                                            <button onClick={() => { setEditTaskId(t.id); setEditTaskForm({ title: t.title, status: t.status }); }}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            </button>
                                            <button onClick={() => { if (confirm(`Delete "${t.title}"?`)) handleDeleteTask(t.id); }}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                            </button>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                t.status === 'DONE' ? 'bg-green-100 text-green-700' :
                                                t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>{t.status?.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )) : (
                            <p className="text-sm text-gray-400 text-center py-8">No tasks assigned yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── My Personal Tasks (Assigned to Me) ── */}
            {myPersonalTasks.length > 0 && (
                <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 shadow-sm p-4 sm:p-6">
                    <h2 className="text-base font-semibold text-indigo-900 flex items-center space-x-2 mb-4">
                        <Clock className="w-5 h-5 text-indigo-500" />
                        <span>Tasks Assigned to Me</span>
                        <span className="ml-auto text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{myPersonalTasks.length} pending</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myPersonalTasks.map((t: any) => (
                            <div key={t.id} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                onClick={() => handleUpdateTaskStatus(t.id, t.status)}>
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm font-bold text-gray-900 truncate pr-2">{t.title}</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        t.status === 'DONE' ? 'bg-green-100 text-green-700' :
                                        t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>{t.status?.replace('_', ' ')}</span>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{t.description || 'No description provided.'}</p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-[10px] text-gray-400">Click to update status</span>
                                    {t.project_name && <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Project: {t.project_name}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Check-in */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col">
                    <h2 className="text-base font-semibold text-gray-900 mb-2">Check-in with Team</h2>
                    <p className="text-xs text-gray-500 mb-4">Send messages, files, or audio notes to Elite Members.</p>

                    <div className="flex-1 flex flex-col space-y-4">
                        {/* Employee select */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Elite Member</label>
                            <select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="" disabled>Choose a team member...</option>
                                {team.map(member => (
                                    <option key={member.id} value={member.id}>{member.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Message text */}
                        <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-gray-700">Message (optional)</label>
                                <button onClick={handleGenerateQuestion} disabled={isGenerating || !selectedEmployee}
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
                                    {isGenerating ? 'Generating...' : '✨ Generate with AI'}
                                </button>
                            </div>
                            <textarea
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                                className="w-full flex-1 border border-gray-300 bg-white text-gray-900 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[80px] placeholder-gray-400"
                                placeholder="e.g. What blockers did you face today?"
                            />
                        </div>

                        {/* Attachment options */}
                        <div className="flex items-center space-x-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
                                className="hidden"
                                onChange={e => setAttachment(e.target.files?.[0] || null)}
                            />
                            <button type="button" onClick={() => fileInputRef.current?.click()}
                                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-indigo-300 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                <span>Attach File</span>
                            </button>

                            <button type="button"
                                onClick={async () => {
                                    if (isRecording && mediaRecorder) {
                                        mediaRecorder.stop();
                                        setIsRecording(false);
                                    } else {
                                        try {
                                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                            const chunks: BlobPart[] = [];
                                            const rec = new MediaRecorder(stream);
                                            rec.ondataavailable = e => chunks.push(e.data);
                                            rec.onstop = () => {
                                                const blob = new Blob(chunks, { type: 'audio/webm' });
                                                const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
                                                setAttachment(file);
                                                stream.getTracks().forEach(t => t.stop());
                                            };
                                            rec.start();
                                            setMediaRecorder(rec);
                                            setIsRecording(true);
                                        } catch { alert('Microphone access denied.'); }
                                    }
                                }}
                                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${isRecording ? 'border-red-400 bg-red-50 text-red-600 animate-pulse' : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-indigo-300'
                                    }`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                                <span>{isRecording ? 'Stop Recording' : 'Record Audio'}</span>
                            </button>
                        </div>

                        {/* Attachment preview */}
                        {attachment && (
                            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                                <div className="flex items-center space-x-2 min-w-0">
                                    <span className="text-lg flex-shrink-0">
                                        {attachment.type.startsWith('audio') ? '🎵' : attachment.type.startsWith('image') ? '🖼️' : attachment.type.startsWith('video') ? '🎬' : '📄'}
                                    </span>
                                    <span className="text-xs text-indigo-700 font-medium truncate">{attachment.name}</span>
                                    <span className="text-xs text-gray-400 flex-shrink-0">{(attachment.size / 1024).toFixed(0)}KB</span>
                                </div>
                                <button onClick={() => setAttachment(null)} className="ml-2 text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                            </div>
                        )}

                        {/* Send */}
                        <button
                            onClick={handleSendQuestion}
                            disabled={isSending || !selectedEmployee || (!questionText && !attachment)}
                            className="bg-indigo-600 text-white w-full py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-colors shadow-md font-semibold text-sm mt-auto disabled:bg-indigo-300 disabled:cursor-not-allowed"
                        >
                            {isSending ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending...</span></>
                            ) : (
                                <><Send className="w-4 h-4" /><span>Send Message</span></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            {/* Previous section (Check-in) grid ends at 656 */}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Recent Responses Section */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2 mb-6 text-indigo-900 border-b border-indigo-50 pb-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Recent Team Responses</span>
                    </h2>
                    <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                        {questions.filter(q => q.responses && q.responses.length > 0).map((q: any) => (
                            <div key={q.id} className="border border-gray-100 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Q: {q.question_text || '[Attachment]'}</span>
                                        <span className="text-[10px] text-gray-500 mt-0.5">Asked by: <span className="font-semibold text-indigo-700">{q.creator?.name || 'Unknown'}</span> ({ (q.creator?.role === 'ADMIN' ? 'Elite' : q.creator?.role === 'MANAGER' ? 'Creative Manager' : q.creator?.role) || 'SYSTEM'})</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400">{new Date().toLocaleDateString()}</span>
                                </div>
                                {q.attachment_url && (
                                    <div className="mb-2">
                                        {q.attachment_type === 'audio' ? (
                                            <audio controls src={`${API_BASE_URL}${q.attachment_url}`} className="h-8 w-full" />
                                        ) : q.attachment_type === 'image' ? (
                                            <img src={`${API_BASE_URL}${q.attachment_url}`} alt="attachment" className="max-h-32 rounded-lg border" />
                                        ) : (
                                            <a href={`${API_BASE_URL}${q.attachment_url}`} target="_blank" rel="noopener noreferrer"
                                                className="text-xs text-indigo-600 underline flex items-center space-x-1">
                                                <span>📄</span><span>View Attachment</span>
                                            </a>
                                        )}
                                    </div>
                                )}
                                {q.responses.map((r: any) => (
                                    <div key={r.id} className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 ml-4 mt-2">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center flex-shrink-0">
                                                <span className="text-indigo-800 font-bold text-[10px] uppercase">
                                                    {r.employee_name ? r.employee_name.charAt(0) : 'E'}
                                                </span>
                                            </div>
                                            <span className="text-xs font-semibold text-gray-700">{r.employee_name || 'Elite Member'}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 pl-7">{r.response_text}</p>
                                    </div>
                                ))}
                            </div>
                        ))}
                        {questions.filter(q => q.responses && q.responses.length > 0).length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-8 italic">No responses from your team yet.</p>
                        )}
                    </div>
                </div>

                {/* Submit Work Panel for Manager */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2 mb-2">
                        <UploadCloud className="w-5 h-5 text-purple-500" />
                        <span>Submit My Work</span>
                    </h2>
                    <p className="text-xs text-gray-500 mb-5">Upload a file or add a note for any project you are working on.</p>

                    <div className="flex-1 flex flex-col space-y-3">
                        <select value={submitProjectId} onChange={e => setSubmitProjectId(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="" disabled>Select Project...</option>
                            {allProjects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>

                        <input ref={workFileInputRef} type="file" className="hidden"
                            onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                        <div onClick={() => workFileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center p-5 cursor-pointer min-h-[100px]">
                            {uploadFile ? (
                                <div className="flex items-center space-x-2">
                                    <span className="text-2xl">{uploadFile.type.startsWith('image') ? '🖼️' : uploadFile.type.startsWith('video') ? '🎬' : '📄'}</span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 truncate max-w-[180px]">{uploadFile.name}</p>
                                        <p className="text-xs text-gray-400">{(uploadFile.size / 1024).toFixed(0)} KB</p>
                                    </div>
                                    <button type="button" onClick={e => { e.stopPropagation(); setUploadFile(null); if (workFileInputRef.current) workFileInputRef.current.value = ''; }}
                                        className="text-red-400 hover:text-red-600 text-xl ml-2">&times;</button>
                                </div>
                            ) : (
                                <>
                                    <UploadCloud className="w-7 h-7 text-gray-400 mb-1" />
                                    <p className="text-sm font-medium text-gray-600">Click to upload</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Video, Image, or Document</p>
                                </>
                            )}
                        </div>

                        <textarea value={submitComment} onChange={e => setSubmitComment(e.target.value)} rows={2}
                            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-gray-400"
                            placeholder="Add a note or description..." />

                        <button onClick={handleSubmitWork} disabled={isSubmittingWork || !submitProjectId}
                            className="bg-indigo-600 text-white w-full py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-colors shadow-sm font-semibold text-sm mt-auto disabled:bg-indigo-300 disabled:cursor-not-allowed">
                            <UploadCloud className="w-4 h-4" />
                            <span>{isSubmittingWork ? 'Submitting...' : 'Submit Work'}</span>
                        </button>
                    </div>
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

