"use client";
import React from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api, API_BASE_URL } from '@/lib/api';
import { GanttChart } from '@/components/GanttChart';
import {
    Plus, Search, Filter, Shield, MoreVertical, Trash2, Edit, CheckCircle, CheckCircle2,
    User, Send, MessageSquare, Briefcase, Calendar, BarChart2, TrendingUp, Clock, X,
    Users, ChartBar, Loader2, ClipboardList, UploadCloud, AlertCircle, Download, FileText, ExternalLink, File as FileIcon
} from 'lucide-react';

export default function ManagerDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [team, setTeam] = React.useState<any[]>([]);
    const [stats, setStats] = React.useState({ productivity: 0, completion: 0, efficiency: 0 });
    const [isSending, setIsSending] = React.useState(false);
    const [questions, setQuestions] = React.useState<any[]>([]);
    const [kpiAnalytics, setKpiAnalytics] = React.useState<any>(null);
    const [kpiMetrics, setKpiMetrics] = React.useState<any[]>([]);
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
    const [editTaskForm, setEditTaskForm] = React.useState({ title: '', description: '', due_date: '', status: '' });
    const [isSavingTaskEdit, setIsSavingTaskEdit] = React.useState(false);
    const [viewTaskId, setViewTaskId] = React.useState<number | null>(null);
    const [myPersonalTasks, setMyPersonalTasks] = React.useState<any[]>([]);
    const [allProjects, setAllProjects] = React.useState<any[]>([]);
    const [showFullGantt, setShowFullGantt] = React.useState(false);
    const [clients, setClients] = React.useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = React.useState<string>("");
    const [selectedStatusFilter, setSelectedStatusFilter] = React.useState<string>("");
    
    // Work Submission state
    const [submitProjectId, setSubmitProjectId] = React.useState<string>('');
    const [submitComment, setSubmitComment] = React.useState('');
    const [isSubmittingWork, setIsSubmittingWork] = React.useState(false);
    const [uploadFile, setUploadFile] = React.useState<File | null>(null);
    const workFileInputRef = React.useRef<HTMLInputElement>(null);
    const [completingTaskId, setCompletingTaskId] = React.useState<number | null>(null);
    const [completionNotes, setCompletionNotes] = React.useState('');

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        const loadManagerData = async () => {
            if (!user || authLoading) return;
            
            try {
                // PHASE 1: Immediate Stats
                const summaryRes = await api.get('analytics/summary');
                if (summaryRes.data) {
                    setStats({
                        productivity: summaryRes.data.avg_productivity || 0,
                        completion: summaryRes.data.avg_completion || 0,
                        efficiency: summaryRes.data.avg_efficiency || 0
                    });
                }

                // PHASE 2: Background Data
                const [usersRes, analyticsRes, kpiRes, questionsRes, projectsRes, clientsRes, tasksRes] = await Promise.all([
                    api.get('users/').catch(() => ({ data: [] })),
                    api.get('analytics/').catch(() => ({ data: [] })),
                    api.get('kpi-forms/analytics/overview').catch(() => ({ data: null })),
                    api.get('questions/').catch(() => ({ data: [] })),
                    api.get('projects/').catch(() => ({ data: [] })),
                    api.get('clients/').catch(() => ({ data: [] })),
                    api.get('tasks/').catch(() => ({ data: [] }))
                ]);

                const userData = usersRes.data || [];
                setTeam(userData.filter((u: any) => u.id !== user.id));
                
                const kpis = analyticsRes.data || [];
                setKpiMetrics(kpis);
                
                setKpiAnalytics(kpiRes.data);
                setQuestions(questionsRes.data || []);
                const projectData = projectsRes.data || [];
                setTaskProjects(projectData);
                setAllProjects(projectData);
                setClients(clientsRes.data || []);
                
                const allTasks = tasksRes.data || [];
                setSentTasks(allTasks);
                setMyPersonalTasks(allTasks.filter((t: any) => t.assigned_user === user.id));
            } catch (err) {
                console.error("Dashboard staged load failed", err);
            }
        };

        loadManagerData();
    }, [user, authLoading, router]);



    if (authLoading || !user) return null;

    // Task assignment handler
    const handleAssignTask = async () => {
        if (!taskTitle.trim()) return alert('Please enter a task title.');
        if (!taskAssignTo) return alert('Please select an employee.');
        setIsSendingTask(true);
        try {
            await api.post('tasks/', {
                title: taskTitle,
                description: taskDesc || null,
                assigned_user: parseInt(taskAssignTo),
                project_id: taskProjectId ? parseInt(taskProjectId) : null,
                due_date: taskDueDate || null,
            });
            setTaskTitle(''); setTaskDesc(''); setTaskAssignTo('');
            setTaskDueDate(''); setTaskProjectId('');
            const res = await api.get('tasks/');
            setSentTasks(res.data);
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        } finally { setIsSendingTask(false); }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!window.confirm('Are you sure you want to clear this task? This will also update the employee\'s KPI.')) return;
        try {
            await api.delete(`tasks/${taskId}`);
            const res = await api.get('tasks/');
            setSentTasks(res.data);
            
            // Refresh KPI metrics to show immediate impact
            const kpiRes = await api.get('analytics/calculate/all');
            setKpiMetrics(kpiRes.data);
        } catch (err: any) {
            alert('Failed to clear task: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleClearCompletedTasks = async () => {
        const completedTasks = sentTasks.filter((t: any) => t.status === 'DONE');
        if (completedTasks.length === 0) return alert('No completed tasks to clear.');
        if (!confirm(`Clear all ${completedTasks.length} completed tasks?`)) return;
        
        try {
            for (const task of completedTasks) {
                await api.delete(`tasks/${task.id}`);
            }
            const res = await api.get('tasks/');
            setSentTasks(res.data);
            const kpiRes = await api.get('analytics/calculate/all');
            setKpiMetrics(kpiRes.data);
            alert('Completed tasks cleared.');
        } catch (err: any) {
            alert('Failed to clear: ' + err.message);
        }
    };

    const handleExportExcel = async () => {
        try {
            const params: any = {};
            if (selectedProjectId) {
                params.project_id = selectedProjectId;
            }
            const response = await api.get('tasks/export/excel', {
                params,
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const filename = selectedProjectId 
                ? `tasks_report_${allProjects.find(p => p.id === parseInt(selectedProjectId))?.name || 'filtered'}_${new Date().toISOString().split('T')[0]}.xlsx`
                : `tasks_report_all_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err: any) {
            let errorMsg = err.message;
            if (err.response && err.response.data instanceof Blob) {
                try {
                    const errorText = await err.response.data.text();
                    const parseErr = JSON.parse(errorText);
                    errorMsg = parseErr.detail || parseErr.message || errorText;
                } catch (e) { }
            }
            alert('Export failed: ' + errorMsg);
        }
    };

    const handleEditTaskSave = async (taskId: number) => {
        setIsSavingTaskEdit(true);
        try {
            await api.put(`tasks/${taskId}`, {
                title: editTaskForm.title || undefined,
                description: editTaskForm.description || undefined,
                due_date: editTaskForm.due_date || undefined,
                status: editTaskForm.status || undefined
            });
            setEditTaskId(null);
            const res = await api.get('tasks/');
            setSentTasks(res.data);
        } catch (err: any) { alert('Failed: ' + (err.response?.data?.detail || err.message)); }
        finally { setIsSavingTaskEdit(false); }
    };

    const handleUpdateTaskStatus = async (taskId: number, currentStatus: string, notes?: string) => {
        const statuses = ['TODO', 'IN_PROGRESS', 'DONE'];
        const currentIndex = statuses.indexOf(currentStatus);
        const nextStatus = statuses[(currentIndex + 1) % statuses.length];

        if (nextStatus === 'DONE' && !notes && notes !== '') {
            setCompletingTaskId(taskId);
            setCompletionNotes('');
            return;
        }

        try {
            await api.put(`tasks/${taskId}`, { 
                status: nextStatus,
                completion_notes: notes || undefined 
            });
            setCompletingTaskId(null);
            // Trigger KPI recalculation for this employee
            const task = sentTasks.find(t => t.id === taskId);
            if (task) {
                await api.post(`analytics/calculate/${task.assigned_user}`);
            }
            const res = await api.get('tasks/');
            setSentTasks(res.data);
            setMyPersonalTasks(res.data.filter((t: any) => t.assigned_user === user.id));
            
            // Refresh kpi metrics
            const kpiRes = await api.get('analytics/');
            setKpiMetrics(kpiRes.data);
            if (kpiRes.data.length > 0) {
                const kpis = kpiRes.data;
                const avgProd = kpis.reduce((acc: any, curr: any) => acc + curr.productivity_score, 0) / kpis.length;
                setStats(s => ({ ...s, productivity: avgProd }));
            }
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
                const res = await api.post('upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                fileUrl = `${API_BASE_URL}${res.data.url}`;
            }
            await api.post('submissions/', { project_id: parseInt(submitProjectId), file_url: fileUrl, comment: submitComment });
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
                        <div className="flex items-center space-x-3">
                            {allProjects.some((p: any) => p.deadline && new Date(p.deadline) < today) && (
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
                            {kpiMetrics.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-gray-400">No performance data yet.</p>
                                    <p className="text-xs text-gray-300 mt-1">Metrics update when tasks are completed.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Team Summary stat */}
                                    <div className="flex space-x-3 mb-4">
                                        <div className="flex-1 text-center p-3 bg-indigo-50 rounded-xl">
                                            <p className="text-2xl font-black text-indigo-600">{Math.round(stats.productivity)}</p>
                                            <p className="text-xs text-gray-500">Avg Productivity</p>
                                        </div>
                                        <div className="flex-1 text-center p-3 bg-green-50 rounded-xl">
                                            <p className="text-2xl font-black text-green-600">{Math.round(stats.completion)}%</p>
                                            <p className="text-xs text-gray-500">Completion</p>
                                        </div>
                                    </div>
                                    {/* Employee score bars */}
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                        {team.map(emp => {
                                            const metric = kpiMetrics.find(m => m.employee_id === emp.id);
                                            return (
                                                <div key={emp.id} className="flex items-center space-x-3 group">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-600 mb-1 truncate">{emp.name}</p>
                                                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                            {metric && (
                                                                <div className={`h-full rounded-full transition-all duration-500 ${
                                                                    metric.productivity_score >= 75 ? 'bg-green-500' : 
                                                                    metric.productivity_score >= 50 ? 'bg-yellow-400' : 'bg-red-500'
                                                                }`}
                                                                style={{ width: `${metric.productivity_score}%` }} />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={`text-xs font-bold w-8 text-right ${
                                                        metric ? (metric.productivity_score >= 75 ? 'text-green-600' : metric.productivity_score >= 50 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-300'
                                                    }`}>{metric ? Math.round(metric.productivity_score) : '—'}</span>
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
                                const metric = kpiMetrics.find(m => m.employee_id === kpiSelectedId);
                                const emp = team.find(e => e.id === kpiSelectedId);
                                return (
                                    <div className="space-y-3">
                                        <div className="text-center p-4 bg-purple-50 rounded-xl">
                                            <p className={`text-4xl font-black ${metric ? (metric.productivity_score >= 75 ? 'text-green-600' : metric.productivity_score >= 50 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-300'
                                                }`}>{metric ? Math.round(metric.productivity_score) : '—'}</p>
                                            <p className="text-xs text-gray-500 mt-1">{emp?.name}'s Performance Score</p>
                                            {metric && (
                                                <div className="grid grid-cols-3 gap-1 mt-2">
                                                    <div className="text-[10px] text-gray-400">Tasks: {Math.round(metric.task_score)}</div>
                                                    <div className="text-[10px] text-gray-400">Proj: {Math.round(metric.project_score)}</div>
                                                    <div className="text-[10px] text-gray-400">Form: {Math.round(metric.form_score)}</div>
                                                </div>
                                            )}
                                        </div>
                                        {metric ? (
                                            <>
                                                <div className="w-full bg-gray-100 rounded-full h-3">
                                                    <div className={`h-3 rounded-full transition-all duration-500 ${metric.productivity_score >= 75 ? 'bg-green-500' : metric.productivity_score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                                        style={{ width: `${metric.productivity_score}%` }} />
                                                </div>
                                                <p className={`text-center text-sm font-semibold ${metric.productivity_score >= 75 ? 'text-green-600' : metric.productivity_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                                                    }`}>
                                                    {metric.productivity_score >= 75 ? '✅ High Performer' : metric.productivity_score >= 50 ? '⚠️ Average Performance' : '🔴 Needs Attention'}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-gray-400 text-center">No performance data yet.</p>
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
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-black">
                            <option value="" disabled>Assign to Elite Member...</option>
                            {team.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                            placeholder="Task title (required)"
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-600 text-black" />
                        <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} rows={2}
                            placeholder="Description (optional)"
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-gray-600 text-black" />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Due Date (optional)</label>
                                <input type="datetime-local" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-black font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Link to Project (optional)</label>
                                <select value={taskProjectId} onChange={e => setTaskProjectId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-black font-medium">
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
                {/* Sent Tasks list - REDESIGNED */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                    {/* Header Section */}
                    <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/30">
                        <div className="flex items-center space-x-3">
                            <div className="bg-indigo-100 p-2 rounded-xl">
                                <ClipboardList className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 leading-none">Task Oversight</h2>
                                <p className="text-xs text-gray-500 mt-1">Manage and track all distributed tasks.</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                                <Filter className="w-4 h-4 text-gray-400 ml-1" />
                                <select 
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="bg-transparent text-sm font-semibold text-gray-700 outline-none pr-6 cursor-pointer"
                                >
                                    <option value="">All Projects</option>
                                    {allProjects.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                                <Filter className="w-4 h-4 text-gray-400 ml-1" />
                                <select 
                                    value={selectedStatusFilter}
                                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                                    className="bg-transparent text-sm font-semibold text-gray-700 outline-none pr-6 cursor-pointer"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="TODO">TODO</option>
                                    <option value="IN_PROGRESS">IN PROGRESS</option>
                                    <option value="DONE">DONE</option>
                                </select>
                            </div>
                            
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center space-x-1.5 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-all text-xs font-bold shadow-sm"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Export (XLSX)</span>
                            </button>

                            {sentTasks.some((t: any) => t.status === 'DONE') && (
                                <button 
                                    onClick={handleClearCompletedTasks}
                                    className="text-xs font-bold text-red-600 hover:text-white hover:bg-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg transition-all shadow-sm"
                                >
                                    Clear Completed
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white" style={{ maxHeight: 480 }}>
                        {(() => {
                            let filteredTasks = selectedProjectId 
                                ? sentTasks.filter((t: any) => t.project_id === parseInt(selectedProjectId))
                                : sentTasks;
                                
                            if (selectedStatusFilter) {
                                filteredTasks = filteredTasks.filter((t: any) => t.status === selectedStatusFilter);
                            }

                            if (filteredTasks.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="bg-gray-50 p-4 rounded-full mb-4">
                                            <Search className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-500">No tasks found.</p>
                                        <p className="text-xs text-gray-400 mt-1">Try switching the project filter or assigning new tasks.</p>
                                    </div>
                                );
                            }

                            const grouped = filteredTasks.reduce((acc: any, t: any) => {
                                const key = t.project_name || 'General Tasks';
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(t);
                                return acc;
                            }, {});
                            
                            return (
                                <div className="divide-y divide-gray-50">
                                    {Object.entries(grouped).map(([projName, projTasks]: [string, any]) => (
                                        <div key={projName} className="p-4">
                                            {!selectedProjectId && (
                                                <div className="flex items-center space-x-2 mb-4">
                                                    <span className="h-4 w-1 bg-indigo-500 rounded-full"></span>
                                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{projName}</h3>
                                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md ml-1">{projTasks.length}</span>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 gap-3">
                                                {projTasks.map((t: any) => (
                                                    <div key={t.id} onClick={() => { if (editTaskId !== t.id) setViewTaskId(t.id); }} className="group relative bg-white border border-gray-100 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer">
                                                        {editTaskId === t.id ? (
                                                            <div className="space-y-3">
                                                                <input value={editTaskForm.title}
                                                                    onChange={e => setEditTaskForm(f => ({ ...f, title: e.target.value }))}
                                                                    placeholder="Task title"
                                                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                                                <textarea value={editTaskForm.description}
                                                                    onChange={e => setEditTaskForm(f => ({ ...f, description: e.target.value }))}
                                                                    placeholder="Description (optional)"
                                                                    rows={2}
                                                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all" />
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <select value={editTaskForm.status}
                                                                        onChange={e => setEditTaskForm(f => ({ ...f, status: e.target.value }))}
                                                                        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                                                        <option value="TODO">TODO</option>
                                                                        <option value="IN_PROGRESS">IN PROGRESS</option>
                                                                        <option value="DONE">DONE</option>
                                                                    </select>
                                                                    <input type="datetime-local" value={editTaskForm.due_date}
                                                                        onChange={e => setEditTaskForm(f => ({ ...f, due_date: e.target.value }))}
                                                                        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                                                </div>
                                                                <div className="flex space-x-3 pt-2">
                                                                    <button onClick={() => setEditTaskId(null)}
                                                                        className="flex-1 border-2 border-gray-100 text-gray-600 rounded-xl py-2.5 text-xs font-bold hover:bg-gray-50 transition-colors uppercase tracking-widest">Cancel</button>
                                                                    <button onClick={() => handleEditTaskSave(t.id)} disabled={isSavingTaskEdit}
                                                                        className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-xs font-bold hover:bg-indigo-700 disabled:bg-indigo-300 transition-all shadow-md shadow-indigo-600/20 uppercase tracking-widest">
                                                                        {isSavingTaskEdit ? 'Saving…' : 'Update Task'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between">
                                                                {/* Status Icon */}
                                                                <div className="flex items-center space-x-4 min-w-0 flex-1">
                                                                    <div className={`flex-shrink-0 p-2.5 rounded-xl ${
                                                                        t.status === 'DONE' ? 'bg-green-100' :
                                                                        t.status === 'IN_PROGRESS' ? 'bg-blue-100' :
                                                                        'bg-gray-100'
                                                                    }`}>
                                                                        {t.status === 'DONE' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                                                                         t.status === 'IN_PROGRESS' ? <Clock className="w-5 h-5 text-blue-600 animate-pulse" /> :
                                                                         <AlertCircle className="w-5 h-5 text-gray-400" />}
                                                                    </div>
                                                                    <div className="min-w-0 pr-4">
                                                                        <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{t.title}</h4>
                                                                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1">
                                                                            <span className="flex items-center text-[11px] font-medium text-gray-500">
                                                                                <User className="w-3 h-3 mr-1 text-indigo-400" />
                                                                                {t.assigned_user_name || `User #${t.assigned_user}`}
                                                                            </span>
                                                                            {t.due_date && (
                                                                                <span className={`flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                                                                                    new Date(t.due_date) < new Date() && t.status !== 'DONE' 
                                                                                        ? 'bg-red-50 text-red-600 border-red-100' 
                                                                                        : 'bg-gray-50 text-gray-500 border-gray-100'
                                                                                }`}>
                                                                                    <Calendar className="w-2.5 h-2.5 mr-1" />
                                                                                    {new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        {/* Explicit timestamps on the card for high visibility */}
                                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                                            <span className="text-[9px] font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">
                                                                                Assigned: {new Date(t.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                            {t.completed_at && (
                                                                                <span className="text-[9px] font-semibold text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded">
                                                                                    Done: {new Date(t.completed_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center space-x-2">
                                                                    {/* Actions — only show for tasks assigned to OTHER employees, not the manager's own tasks */}
                                                                    {t.assigned_user !== user?.id && (
                                                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={(e) => { e.stopPropagation(); setEditTaskId(t.id); setEditTaskForm({ title: t.title, description: t.description || '', due_date: t.due_date?.split('T')[0] || '', status: t.status }); }}
                                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Quick Edit">
                                                                                <Edit className="w-4 h-4" />
                                                                            </button>
                                                                            <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${t.title}"?`)) handleDeleteTask(t.id); }}
                                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete Task">
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* Status Pill */}
                                                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border ${
                                                                        t.status === 'DONE' ? 'bg-green-500 text-white border-green-400' :
                                                                        t.status === 'IN_PROGRESS' ? 'bg-blue-500 text-white border-blue-400' :
                                                                        'bg-white text-gray-400 border-gray-200'
                                                                    }`}>
                                                                        {t.status?.replace('_', ' ')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* ── My Personal Tasks (Assigned to Me) ── */}
            {myPersonalTasks.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-indigo-50/30">
                        <div className="flex items-center space-x-3">
                            <div className="bg-indigo-100 p-2 rounded-xl"><Clock className="w-5 h-5 text-indigo-600" /></div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Tasks Assigned to Me</h2>
                                <p className="text-xs text-gray-500">Click any card to view details. Use Advance to progress.</p>
                            </div>
                        </div>
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                            {myPersonalTasks.filter((t: any) => t.status !== 'DONE').length} active
                        </span>
                    </div>
                    <div className="p-4 sm:p-6 space-y-8">
                        {(() => {
                            const grouped = myPersonalTasks.reduce((acc: any, t: any) => {
                                const key = t.project_name || 'No Project';
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(t);
                                return acc;
                            }, {});
                            
                            return Object.entries(grouped).map(([projName, projTasks]: [string, any]) => (
                                <div key={projName} className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <span className="h-4 w-1 bg-indigo-400 rounded-full"></span>
                                        <h3 className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">{projName}</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {projTasks.map((t: any) => {
                                            const isDone = t.status === 'DONE';
                                            const isInProgress = t.status === 'IN_PROGRESS';
                                            const dueDate = t.due_date ? new Date(t.due_date) : null;
                                            const isOverdue = dueDate && dueDate < new Date() && !isDone;
                                            return (
                                                <div key={t.id} onClick={() => setViewTaskId(t.id)}
                                                    className={`group relative bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col overflow-hidden ${isDone ? 'border-green-100' : isOverdue ? 'border-red-200' : isInProgress ? 'border-blue-100' : 'border-gray-100 hover:border-indigo-200'}`}
                                                >
                                                    <div className={`h-1 w-full ${isDone ? 'bg-gradient-to-r from-green-400 to-emerald-400' : isInProgress ? 'bg-gradient-to-r from-blue-400 to-indigo-400' : isOverdue ? 'bg-gradient-to-r from-red-400 to-orange-400' : 'bg-gradient-to-r from-gray-200 to-gray-300'}`} />
                                                    <div className="p-4 flex flex-col flex-1">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <p className={`text-sm font-bold leading-snug pr-2 transition-colors ${isDone ? 'line-through text-gray-400' : isOverdue ? 'text-red-700' : 'text-gray-900 group-hover:text-indigo-700'}`}>{t.title}</p>
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-tighter ${isDone ? 'bg-green-100 text-green-700' : isInProgress ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{t.status?.replace('_', ' ')}</span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 line-clamp-2 mb-3 leading-relaxed italic">{t.description || 'No description provided.'}</p>
                                                        <div className="mt-auto border-t border-gray-50 pt-2 space-y-1">
                                                            <div className="flex justify-between">
                                                                <span className="text-[9px] text-gray-400">Assigned: {new Date(t.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                                {dueDate && <span className={`text-[9px] font-semibold ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>{isOverdue ? '⚠️ ' : ''}Due: {dueDate.toLocaleDateString()}</span>}
                                                            </div>
                                                            {t.started_at && <span className="block text-[9px] text-blue-400">Started: {new Date(t.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>}
                                                            {t.completed_at && (
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[9px] text-green-600 font-semibold">Done: {new Date(t.completed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                                    <span className="text-[9px] font-bold text-indigo-500 flex items-center">
                                                                        <Clock className="w-2.5 h-2.5 mr-0.5" />
                                                                        {(() => { const s=new Date(t.started_at||t.created_at),e=new Date(t.completed_at),d=Math.max(0,e.getTime()-s.getTime()),h=Math.floor(d/(1000*60*60)),m=Math.floor((d/(1000*60))%60); return `${h}h ${m}m`; })()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center pt-1 border-t border-gray-50 mt-1">
                                                                <span className="text-[9px] text-gray-400">From: <span className="font-semibold text-indigo-500">{t.assigned_by_name || 'Admin'}</span></span>
                                                                {!isDone && (
                                                                    <button onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(t.id, t.status); }}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 text-[9px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100"
                                                                    >Advance →</button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            )}

            {/* Submit Work Panel for Manager */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
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
                            placeholder="Add a note (optional)..."
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />

                        <button onClick={handleSubmitWork}
                            disabled={isSubmittingWork || !submitProjectId || (!uploadFile && !submitComment)}
                            className="bg-indigo-600 text-white w-full py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-colors shadow-sm font-semibold text-sm mt-auto disabled:bg-indigo-300 disabled:cursor-not-allowed">
                            <UploadCloud className="w-4 h-4" />
                            <span>{isSubmittingWork ? 'Submitting...' : 'Submit Work'}</span>
                        </button>
                    </div>
                </div>
            </div>


            {/* Team Work Audit Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <FileText className="w-5 h-5 text-purple-500" />
                            <span>Team Work Audit</span>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Review all files and documents submitted by your team across all projects.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allProjects.map((p: any) => (
                        <div key={p.id} className="border border-gray-100 rounded-2xl p-5 hover:border-indigo-100 transition-all bg-gray-50/30">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    {p.logo_url ? (
                                        <div className="w-8 h-8 rounded-lg border border-indigo-100 overflow-hidden bg-white shadow-sm flex-shrink-0">
                                            <img src={`${API_BASE_URL}${p.logo_url}`} alt="Project Logo" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                            <Briefcase className="w-4 h-4 text-indigo-600" />
                                        </div>
                                    )}
                                    <h3 className="text-sm font-bold text-gray-900 truncate pr-2">{p.name}</h3>
                                </div>
                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase">
                                    {p.status}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {p.work_submissions?.map((sub: any) => (
                                    <div key={sub.id} className="flex items-center justify-between p-3 bg-white border border-gray-50 rounded-xl hover:shadow-sm transition-shadow group">
                                        <div className="flex items-center space-x-3 overflow-hidden text-gray-900">
                                            <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                                                <UploadCloud className="w-4 h-4 text-purple-600" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-semibold text-purple-600 truncate uppercase tracking-tighter">Team Work</p>
                                                <p className="text-[11px] font-medium text-gray-800 truncate">{sub.comment || 'Work Submission'}</p>
                                            </div>
                                        </div>
                                        <a href={`${API_BASE_URL}${sub.file_url}`} target="_blank" rel="noreferrer" 
                                           className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-indigo-600">
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </div>
                                ))}

                                {/* Foundational Project Documents */}
                                {p.documents?.map((doc: any) => (
                                    <div key={`found-${doc.id}`} className="flex items-center justify-between p-3 bg-indigo-50/20 border border-indigo-100 rounded-xl hover:shadow-sm transition-shadow group">
                                        <div className="flex items-center space-x-3 overflow-hidden text-gray-900">
                                            <div className="p-2 bg-white rounded-lg group-hover:bg-indigo-50 transition-colors">
                                                <FileIcon className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Foundation</p>
                                                <p className="text-xs font-semibold text-gray-800 truncate">{doc.file_name}</p>
                                            </div>
                                        </div>
                                        <a href={`${API_BASE_URL}${doc.file_url}`} target="_blank" rel="noreferrer" 
                                           className="p-1.5 hover:bg-white rounded-md transition-colors text-gray-400 hover:text-indigo-600">
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </div>
                                ))}
                                {(!p.work_submissions || p.work_submissions.length === 0) && (
                                    <p className="text-[10px] text-gray-400 italic text-center py-2">No work submitted yet.</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {allProjects.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                            <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">No projects to audit.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Full Gantt Chart Modal */}
            {showFullGantt && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/30">
                            <div className="flex items-center space-x-3">
                                <Calendar className="w-6 h-6 text-indigo-500" />
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
                            placeholder="e.g. Uploaded all assets, finished final revision..."
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
                                    const task = myPersonalTasks.find((t: any) => t.id === completingTaskId) || sentTasks.find((t: any) => t.id === completingTaskId);
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
        </div>
    );
}

