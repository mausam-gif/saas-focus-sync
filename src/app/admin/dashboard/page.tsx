"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GanttChart } from '@/components/GanttChart';
import { Plus, Users, FolderKanban, TrendingUp, Search, Send, CheckCircle2, Loader2, Building2, User, ClipboardList, Mic, MicOff, Paperclip, Download, FileText, ExternalLink, File as FileIcon, Briefcase, UploadCloud, X, BarChart2, CalendarDays, Trash2, MessageSquare, Calendar, ChartBar, AlertCircle, Filter, CheckCircle, Edit, Clock, CheckSquare } from 'lucide-react';
import { api, API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const [tasks, setTasks] = useState([]);
    const [kpiAnalytics, setKpiAnalytics] = useState<any>(null);
    const [kpiMetrics, setKpiMetrics] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [stats, setStats] = useState({ employees: 0, projects: 0, avgProductivity: 0 });
    const [loading, setLoading] = useState(true);
    const [showFullGantt, setShowFullGantt] = useState(false);
    const [team, setTeam] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<string>("");
    const [questionText, setQuestionText] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [questions, setQuestions] = useState<any[]>([]);
    // Attachment state for Check-in
    const [attachment, setAttachment] = useState<File | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    // KPI swappable view: 'company' | 'manager' | 'employee'
    const [kpiView, setKpiView] = useState<'company' | 'manager' | 'employee'>('company');
    const [kpiSelectedId, setKpiSelectedId] = useState<number | null>(null);
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    // ── Task Assignment state ───────────────────────────────────────────────────
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [taskAssignTo, setTaskAssignTo] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [taskProjectId, setTaskProjectId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [projects, setProjects] = useState<any[]>([]);
    const [isSendingTask, setIsSendingTask] = useState(false);
    const [sentTasks, setSentTasks] = useState<any[]>([]);
    // Task edit/delete state
    const [editTaskId, setEditTaskId] = useState<number | null>(null);
    const [editTaskForm, setEditTaskForm] = useState({ title: '', description: '', due_date: '', status: '' });
    const [isSavingTaskEdit, setIsSavingTaskEdit] = useState(false);
    const [viewTaskId, setViewTaskId] = useState<number | null>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("");

    const loadData = useCallback(async () => {
        if (!user) return;
        
        // INSTANT LOAD: Check for cached data in session storage
        const cacheKey = `dashboard_data_${user.id}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                processDashboardData(parsed);
                // Don't show global loading if we have cache
                setLoading(false);
            } catch (e) {
                console.error("Cache parse failed", e);
            }
        } else {
            setLoading(true);
        }

        try {
            // PHASE 1: Combined High-Performance Data Fetch
            const res = await api.get('analytics/dashboard-full');
            const data = res.data;
            
            // Update UI
            processDashboardData(data);
            
            // Save to Cache for next time
            sessionStorage.setItem(cacheKey, JSON.stringify(data));

        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const processDashboardData = (data: any) => {
        const summary = data.summary || {};

        // 1. Set Stats
        setStats({
            employees: summary.employee_count || 0,
            projects: summary.active_project_count || 0,
            avgProductivity: summary.avg_productivity || 0,
        });

        // 2. Process Projects & Gantt
        const projectData = data.projects || [];
        setProjects(projectData);
        const fetchedTasks = projectData.map((p: any) => {
            let progress = 20;
            let customClass = 'bar-analysis';
            const s = p.status?.toUpperCase();
            if (s === 'EVALUATION' || s === 'COMPLETED') { progress = 100; customClass = 'bar-evaluation'; }
            else if (s === 'ITERATION') { progress = 80; customClass = 'bar-iteration'; }
            else if (s === 'EXECUTION') { progress = 60; customClass = 'bar-execution'; }
            else if (s === 'STRATEGY') { progress = 40; customClass = 'bar-strategy'; }
            else { progress = 20; customClass = 'bar-analysis'; }

            return {
                id: `Project-${p.id}`,
                name: p.name,
                start: p.start_date.split('T')[0],
                end: p.deadline.split('T')[0],
                progress, dependencies: '', custom_class: customClass
            };
        });
        setTasks(fetchedTasks);

        // 3. Process Users & Team
        const userData = data.users || [];
        const allEmployees = userData.filter((u: any) => u.role.toUpperCase() === 'EMPLOYEE');
        const allManagers = userData.filter((u: any) => u.role.toUpperCase() === 'MANAGER');
        setManagers(allManagers);
        setTeam(allEmployees);
        setAllUsers(userData.filter((u: any) => u.id !== user?.id));

        // 4. Set Tasks & Metrics & Clients & Questions
        setSentTasks(data.tasks || []);
        setKpiMetrics(data.metrics || []);
        setQuestions(data.questions || []);
        setClients(data.clients || []);
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user && !authLoading) {
            loadData();
        }
    }, [user, authLoading, router, loadData]);

    const handleResetKPI = async (empId?: number) => {
        if (!confirm(`Are you sure you want to reset KPI ${empId ? 'for this individual' : 'for the entire company'}? This will delete their score history and recalculate from current tasks.`)) return;
        try {
            await api.post('kpi-forms/reset-kpi', {}, { params: { employee_id: empId } });
            alert('KPI reset and recalculated successfully.');
            loadData();
        } catch (err: any) {
            alert('Failed to reset: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleSyncAllKPIs = async () => {
        try {
            await api.post('analytics/calculate/all');
            alert('All KPIs have been recalculated and synchronized.');
            loadData();
        } catch (err: any) {
            alert('Sync failed: ' + err.message);
        }
    };

    // ── Task Assignment handler ─────────────────────────────────────────────────
    const handleAssignTask = async () => {
        if (!taskTitle.trim()) return alert('Please enter a task title.');
        if (!taskAssignTo) return alert('Please select who to assign the task to.');
        setIsSendingTask(true);
        try {
            await api.post('tasks/', {
                title: taskTitle,
                description: taskDesc || null,
                assigned_user: parseInt(taskAssignTo),
                project_id: taskProjectId ? parseInt(taskProjectId) : null,
                due_date: taskDueDate || null,
            });
            setTaskTitle('');
            setTaskDesc('');
            setTaskAssignTo('');
            setTaskDueDate('');
            setTaskProjectId('');
            loadData();
        } catch (err: any) {
            alert('Failed to assign task: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsSendingTask(false);
        }
    };

    // ── Task edit/delete handlers ────────────────────────────────────────────
    const handleEditTaskSave = async (taskId: number) => {
        setIsSavingTaskEdit(true);
        try {
            await api.put(`tasks/${taskId}`, {
                title: editTaskForm.title || undefined,
                status: editTaskForm.status || undefined,
            });
            setEditTaskId(null);
            loadData();
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        } finally { setIsSavingTaskEdit(false); }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!window.confirm('Are you sure you want to clear this task? This will also update the employee\'s KPI.')) return;
        try {
            await api.delete(`tasks/${taskId}`);
            loadData();
            // Trigger extra KPI sync for immediate visual feedback
            await api.post('analytics/calculate/all');
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleClearCompletedTasks = async () => {
        const completedTasks = sentTasks.filter((t: any) => t.status === 'DONE');
        if (completedTasks.length === 0) return alert('No completed tasks to clear.');
        if (!window.confirm(`Clear all ${completedTasks.length} completed tasks?`)) return;
        
        try {
            setLoading(true);
            for (const task of completedTasks) {
                await api.delete(`tasks/${task.id}`);
            }
            loadData();
            await api.post('analytics/calculate/all');
            alert('Completed tasks cleared successfully.');
        } catch (err: any) {
            alert('Failed to clear some tasks: ' + err.message);
        } finally {
            setLoading(false);
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
                ? `tasks_report_${projects.find(p => p.id === parseInt(selectedProjectId))?.name || 'filtered'}_${new Date().toISOString().split('T')[0]}.xlsx`
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

    return (
        <div className="p-4 sm:p-8 font-sans max-w-7xl mx-auto space-y-6 sm:space-y-8 relative">
            {loading && projects.length === 0 && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-3xl" style={{ minHeight: '80vh' }}>
                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <Loader2 className="w-8 h-8 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
                        </div>
                        <p className="text-sm font-bold text-gray-500 animate-pulse">Syncing Overview...</p>
                    </div>
                </div>
            )}
            {/* Header section modern */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Overview</h1>
                    <p className="text-sm text-gray-500 mt-1">Here's what's happening in your company today.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-auto flex-1 sm:flex-none">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search projects or tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-full text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full sm:w-64 transition-all placeholder-gray-600 text-black"
                        />
                    </div>
                    <button
                        onClick={() => router.push('/admin/projects/')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full sm:rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 shadow-sm whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Project</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[
                    { title: "Total Employees", value: stats.employees.toString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                    { title: "Active Projects", value: stats.projects.toString(), icon: FolderKanban, color: "text-purple-600", bg: "bg-purple-50" },
                    { title: "Avg Productivity", value: `${stats.avgProductivity}%`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 line-clamp-none">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-base font-semibold text-gray-900">Project Timelines</h2>
                        <button 
                            onClick={() => setShowFullGantt(true)}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1"
                        >
                            <BarChart2 className="w-3 h-3" />
                            <span>View All</span>
                        </button>
                    </div>
                    <div className="mt-4">
                        <GanttChart tasks={tasks} />
                    </div>
                </div>

                {/* KPI Panel - Forms-Driven Swappable */}
                <div className="col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col">
                    <div className="mb-4">
                        <h2 className="text-base font-semibold text-gray-900 mb-3">KPI Performance</h2>
                        {/* View Toggle */}
                        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                            {[['company', Building2, 'Company'], ['manager', Users, 'By Manager'], ['employee', User, 'Employee']].map(([key, Icon, label]: any) => (
                                <button key={key} onClick={() => { setKpiView(key); setKpiSelectedId(null); }}
                                    className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-xs font-medium transition-all ${kpiView === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}>
                                    <Icon className="w-3 h-3" /><span>{key === 'manager' ? 'By Creative Manager' : key === 'employee' ? 'Elite Member' : label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Company View */}
                    {kpiView === 'company' && (
                        <div className="flex-1 space-y-2">
                            {kpiMetrics.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-gray-400">No data synchronized yet.</p>
                                    <button onClick={handleSyncAllKPIs} className="text-xs text-indigo-500 mt-2 underline">Sync Performance Metrics</button>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center mb-4 p-3 bg-indigo-50 rounded-xl relative group">
                                        <p className="text-3xl font-black text-indigo-600">{stats.avgProductivity}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Real-time Performance Index</p>
                                        <p className="text-[10px] text-gray-400">Weighted: 60% Tasks, 20% Projects, 20% Forms</p>
                                        <button onClick={handleSyncAllKPIs} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Sync All">
                                            <TrendingUp className="w-3 h-3 text-indigo-400" />
                                        </button>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Elite Member Performance</p>
                                    <div className="space-y-2 overflow-y-auto max-h-48 pr-1 custom-scrollbar">
                                        {kpiMetrics.sort((a,b) => b.productivity_score - a.productivity_score).map((emp: any) => (
                                            <div key={emp.employee_id} className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-600 w-20 truncate">{emp.employee_name}</span>
                                                <div className="flex-1 bg-gray-100 rounded-full h-2 relative">
                                                    <div className={`h-2 rounded-full ${emp.productivity_score >= 75 ? 'bg-green-500' : emp.productivity_score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                                        style={{ width: `${emp.productivity_score}%` }} />
                                                    {/* Small dots for sub-scores overlay if hovered? or just keep simple */}
                                                </div>
                                                <span className={`text-xs font-bold w-8 text-right ${emp.productivity_score >= 75 ? 'text-green-600' : emp.productivity_score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {Math.round(emp.productivity_score)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => handleResetKPI()}
                                        className="w-full mt-2 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors"
                                    >
                                        Reset All KPI History
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Manager View - select manager, see their team's scores */}
                    {kpiView === 'manager' && (
                        <div className="flex-1 space-y-3">
                            <select value={kpiSelectedId ?? ''} onChange={e => setKpiSelectedId(parseInt(e.target.value) || null)}
                                className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2 text-sm outline-none">
                                <option value="">Select a Creative Manager...</option>
                                {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            {kpiSelectedId && (() => {
                                const mgr = managers.find(m => m.id === kpiSelectedId);
                                const mgrTeam = team.filter(e => e.manager_id === kpiSelectedId);
                                const teamMetrics = kpiMetrics.filter((m: any) =>
                                    mgrTeam.some(t => t.id === m.employee_id)
                                );
                                const avgScore = teamMetrics.length > 0
                                    ? Math.round(teamMetrics.reduce((s: number, m: any) => s + m.productivity_score, 0) / teamMetrics.length) : 0;
                                return (
                                    <>
                                        <div className="text-center p-3 bg-blue-50 rounded-xl">
                                            <p className="text-xl font-black text-blue-600">{avgScore}</p>
                                            <p className="text-xs text-gray-500">{mgr?.name}'s Team (Creative Manager) Avg</p>
                                            <p className="text-xs text-gray-400">{mgrTeam.length} member(s)</p>
                                        </div>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {mgrTeam.map(emp => {
                                                const metric = kpiMetrics.find((m: any) => m.employee_id === emp.id);
                                                return (
                                                    <div key={emp.id} className="flex items-center space-x-2">
                                                        <span className="text-xs text-gray-600 w-20 truncate">{emp.name.split(' ')[0]}</span>
                                                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                                                            {metric && <div className={`h-2 rounded-full ${metric.productivity_score >= 75 ? 'bg-green-500' : metric.productivity_score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                                                style={{ width: `${metric.productivity_score}%` }} />}
                                                        </div>
                                                        <span className="text-xs font-bold w-8 text-right text-gray-500">{metric ? Math.round(metric.productivity_score) : '—'}</span>
                                                    </div>
                                                );
                                            })}
                                            {mgrTeam.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No Elite Members under this Creative Manager.</p>}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* Employee View - select one employee, see their score history */}
                    {kpiView === 'employee' && (
                        <div className="flex-1 space-y-3">
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
                                        <div className="text-center p-3 bg-purple-50 rounded-xl">
                                            <p className={`text-4xl font-black ${metric ? (metric.productivity_score >= 75 ? 'text-green-600' : metric.productivity_score >= 50 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-400'}`}>
                                                {metric ? Math.round(metric.productivity_score) : '—'}
                                            </p>
                                            <p className="text-xs text-gray-500">{emp?.name}'s Performance (Elite Member)</p>
                                            {metric && (
                                                <div className="grid grid-cols-3 gap-2 mt-2 border-t border-purple-100 pt-2">
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 uppercase">Tasks</p>
                                                        <p className="text-xs font-bold text-gray-600">{Math.round(metric.task_score)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 uppercase">Project</p>
                                                        <p className="text-xs font-bold text-gray-600">{Math.round(metric.project_score)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 uppercase">Forms</p>
                                                        <p className="text-xs font-bold text-gray-600">{Math.round(metric.form_score)}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {metric && (
                                            <div className="w-full bg-gray-100 rounded-full h-3">
                                                <div className={`h-3 rounded-full transition-all ${metric.productivity_score >= 75 ? 'bg-green-500' : metric.productivity_score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                                    style={{ width: `${metric.productivity_score}%` }} />
                                            </div>
                                        )}
                                        {metric ? (
                                            <button 
                                                onClick={() => handleResetKPI(emp!.id)}
                                                className="w-full mt-1 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors"
                                            >
                                                Reset {emp?.name.split(' ')[0]}'s History
                                            </button>
                                        ) : (
                                            <p className="text-xs text-gray-400 text-center">No performance data synchronized yet.</p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Assign Task Panel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
                {/* Assign Task form */}
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 sm:p-6 flex flex-col">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2 mb-1">
                        <ClipboardList className="w-5 h-5 text-indigo-500" />
                        <span>Assign Task</span>
                    </h2>
                    <p className="text-xs text-gray-500 mb-4">Send a task to any Creative Manager or Elite Member.</p>
                    <div className="flex-1 flex flex-col space-y-3">
                        <select value={taskAssignTo} onChange={e => setTaskAssignTo(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-black">
                            <option value="" disabled>Assign to...</option>
                            <optgroup label="Creative Managers">
                                {allUsers.filter((u: any) => u.role?.toUpperCase() === 'MANAGER').map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name} (Creative Manager)</option>
                                ))}
                            </optgroup>
                            <optgroup label="Elite Members">
                                {allUsers.filter((u: any) => u.role?.toUpperCase() === 'EMPLOYEE').map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name} (Elite Member)</option>
                                ))}
                            </optgroup>
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
                                    {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                                    {projects.map((p: any) => (
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
                                                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <select value={editTaskForm.status}
                                                                        onChange={e => setEditTaskForm(f => ({ ...f, status: e.target.value }))}
                                                                        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                                                        <option value="TODO">TODO</option>
                                                                        <option value="IN_PROGRESS">IN PROGRESS</option>
                                                                        <option value="DONE">DONE</option>
                                                                    </select>
                                                                    <input type="date" value={editTaskForm.due_date}
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
                                                                        {t.status === 'DONE' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
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
                                                                    {/* Actions */}
                                                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={(e) => { e.stopPropagation(); setEditTaskId(t.id); setEditTaskForm({ title: t.title, description: t.description || '', due_date: t.due_date?.split('T')[0] || '', status: t.status }); }}
                                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Quick Edit">
                                                                            <Edit className="w-4 h-4" />
                                                                        </button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(t.id); }}
                                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Archive Task">
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                    
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


            {/* Global Work Audit Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            <span>Global Work Audit</span>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Audit all files and documents submitted by all team members across the company.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects
                        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    p.status.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((p: any) => (
                        <div key={p.id} className="border border-gray-100 rounded-2xl p-5 hover:border-indigo-100 transition-all bg-indigo-50/5 text-gray-900">
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
                                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
                                    {p.status}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {p.work_submissions?.map((sub: any) => (
                                    <div key={sub.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow group">
                                        <div className="flex items-center space-x-3 overflow-hidden text-gray-900">
                                            <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                                <UploadCloud className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-semibold truncate uppercase tracking-tighter text-indigo-600">Team Work</p>
                                                <p className="text-[11px] font-medium truncate">{sub.comment || 'Work Submission'}</p>
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
                                    <div key={`found-${doc.id}`} className="flex items-center justify-between p-3 bg-indigo-50/30 border border-indigo-100 rounded-xl hover:shadow-sm transition-shadow group">
                                        <div className="flex items-center space-x-3 overflow-hidden text-gray-900">
                                            <div className="p-2 bg-white rounded-lg group-hover:bg-indigo-50 transition-colors">
                                                <FileIcon className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Foundation</p>
                                                <p className="text-xs font-semibold truncate">{doc.file_name}</p>
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
                    {projects.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                            <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No projects to audit.</p>
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
                                <CalendarDays className="w-6 h-6 text-indigo-500" />
                                <h3 className="text-xl font-bold text-gray-900">Project Timeline (Gantt View)</h3>
                            </div>
                            <button onClick={() => setShowFullGantt(false)} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
                            <div className="min-w-[800px] bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                <GanttChart tasks={tasks} />
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
        </div>
    );
}

