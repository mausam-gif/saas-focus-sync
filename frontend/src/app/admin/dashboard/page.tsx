"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GanttChart } from '@/components/GanttChart';
import { Plus, Users, FolderKanban, TrendingUp, Search, Send, CheckCircle2, Loader2, Building2, User, ClipboardList, Mic, MicOff, Paperclip } from 'lucide-react';
import { api, API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const [tasks, setTasks] = useState([]);
    const [kpiAnalytics, setKpiAnalytics] = useState<any>(null);
    const [managers, setManagers] = useState<any[]>([]);
    const [stats, setStats] = useState({ employees: 0, projects: 0, avgProductivity: 0 });
    const [loading, setLoading] = useState(true);
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
    const [projects, setProjects] = useState<any[]>([]);
    const [isSendingTask, setIsSendingTask] = useState(false);
    const [sentTasks, setSentTasks] = useState<any[]>([]);
    // Task edit/delete state
    const [editTaskId, setEditTaskId] = useState<number | null>(null);
    const [editTaskForm, setEditTaskForm] = useState({ title: '', description: '', due_date: '', status: '' });
    const [isSavingTaskEdit, setIsSavingTaskEdit] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (authLoading || !user) return;

        const fetchDashboardData = async () => {
            try {
                // Fetch Projects for Gantt Chart
                const projectsRes = await api.get('/projects/');
                setProjects(projectsRes.data);
                const fetchedTasks = projectsRes.data.map((p: any) => {
                    let progress = 50;
                    let customClass = 'bar-active';
                    if (p.status === 'COMPLETED') { progress = 100; customClass = 'bar-completed'; }
                    else if (p.status === 'ON TRACK') { progress = 75; customClass = 'bar-ontrack'; }
                    else if (p.status === 'AT RISK') { progress = 25; customClass = 'bar-atrisk'; }
                    return {
                        id: `Project-${p.id}`,
                        name: p.name,
                        start: p.start_date.split('T')[0],
                        end: p.deadline.split('T')[0],
                        progress, dependencies: '', custom_class: customClass
                    };
                });
                setTasks(fetchedTasks);

                // Fetch Users for Stats and team lists
                const usersRes = await api.get('/users/');
                const allEmployees = usersRes.data.filter((u: any) => u.role.toUpperCase() === 'EMPLOYEE');
                const allManagers = usersRes.data.filter((u: any) => u.role.toUpperCase() === 'MANAGER');
                setManagers(allManagers);
                setTeam(allEmployees);
                // All users (managers + employees) for task assignment
                setAllUsers(usersRes.data.filter((u: any) => u.id !== user?.id));

                // Load already-assigned tasks
                const tasksAssigned = await api.get('/tasks/');
                setSentTasks(tasksAssigned.data);

                // Fetch KPI Forms Analytics (real data from form submissions)
                try {
                    const kpiRes = await api.get('/kpi-forms/analytics/overview');
                    setKpiAnalytics(kpiRes.data);
                    setStats({
                        employees: allEmployees.length,
                        projects: projectsRes.data.length,
                        avgProductivity: kpiRes.data.average_company_score || 0
                    });
                } catch {
                    setStats({ employees: allEmployees.length, projects: projectsRes.data.length, avgProductivity: 0 });
                }

                // Fetch Questions
                const questionsRes = await api.get('/questions/');
                setQuestions(questionsRes.data);

            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, authLoading, router]);

    // ── Task Assignment handler ─────────────────────────────────────────────────
    const handleAssignTask = async () => {
        if (!taskTitle.trim()) return alert('Please enter a task title.');
        if (!taskAssignTo) return alert('Please select who to assign the task to.');
        setIsSendingTask(true);
        try {
            await api.post('/tasks/', {
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
            const res = await api.get('/tasks/');
            setSentTasks(res.data);
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
            await api.put(`/tasks/${taskId}`, {
                title: editTaskForm.title || undefined,
                status: editTaskForm.status || undefined,
            });
            setEditTaskId(null);
            const res = await api.get('/tasks/');
            setSentTasks(res.data);
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        } finally { setIsSavingTaskEdit(false); }
    };

    const handleDeleteTask = async (taskId: number) => {
        try {
            await api.delete(`/tasks/${taskId}`);
            setSentTasks(prev => prev.filter((t: any) => t.id !== taskId));
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.detail || err.message));
        }
    };

    return (
        <div className="p-8 font-sans max-w-7xl mx-auto">
            {/* Header section modern */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Overview</h1>
                    <p className="text-sm text-gray-500 mt-1">Here's what's happening in your company today.</p>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search anything..."
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => router.push('/admin/projects')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Project</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                        <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">View all</button>
                    </div>
                    <div className="mt-4">
                        <GanttChart tasks={tasks} />
                    </div>
                </div>

                {/* KPI Panel - Forms-Driven Swappable */}
                <div className="col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                    <div className="mb-4">
                        <h2 className="text-base font-semibold text-gray-900 mb-3">KPI Performance</h2>
                        {/* View Toggle */}
                        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                            {[['company', Building2, 'Company'], ['manager', Users, 'By Manager'], ['employee', User, 'Employee']].map(([key, Icon, label]: any) => (
                                <button key={key} onClick={() => { setKpiView(key); setKpiSelectedId(null); }}
                                    className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-xs font-medium transition-all ${kpiView === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}>
                                    <Icon className="w-3 h-3" /><span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Company View */}
                    {kpiView === 'company' && (
                        <div className="flex-1 space-y-2">
                            {!kpiAnalytics ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-gray-400">No form submissions yet.</p>
                                    <p className="text-xs text-gray-300 mt-1">Create & assign KPI forms to employees.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center mb-4 p-3 bg-indigo-50 rounded-xl">
                                        <p className="text-3xl font-black text-indigo-600">{kpiAnalytics.average_company_score}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Company Average KPI Score</p>
                                        <p className="text-xs text-gray-400">{kpiAnalytics.completion_rate}% completion rate</p>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">All Employees</p>
                                    <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
                                        {kpiAnalytics.all_employees?.map((emp: any) => (
                                            <div key={emp.employee_id} className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-600 w-20 truncate">{emp.employee_name.split(' ')[0]}</span>
                                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                                    <div className={`h-2 rounded-full ${emp.average_score >= 75 ? 'bg-green-500' : emp.average_score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                                        style={{ width: `${emp.average_score}%` }} />
                                                </div>
                                                <span className={`text-xs font-bold w-8 text-right ${emp.average_score >= 75 ? 'text-green-600' : emp.average_score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {emp.average_score}
                                                </span>
                                            </div>
                                        ))}
                                        {kpiAnalytics.all_employees?.length === 0 && (
                                            <p className="text-xs text-gray-400 text-center py-2">No scores yet.</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Manager View - select manager, see their team's scores */}
                    {kpiView === 'manager' && (
                        <div className="flex-1 space-y-3">
                            <select value={kpiSelectedId ?? ''} onChange={e => setKpiSelectedId(parseInt(e.target.value) || null)}
                                className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2 text-sm outline-none">
                                <option value="">Select a Manager...</option>
                                {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            {kpiSelectedId && (() => {
                                const mgr = managers.find(m => m.id === kpiSelectedId);
                                const mgrTeam = team.filter(e => e.manager_id === kpiSelectedId);
                                const teamScores = kpiAnalytics?.all_employees?.filter((e: any) =>
                                    mgrTeam.some(t => t.id === e.employee_id)
                                ) || [];
                                const avgScore = teamScores.length > 0
                                    ? Math.round(teamScores.reduce((s: number, e: any) => s + e.average_score, 0) / teamScores.length) : 0;
                                return (
                                    <>
                                        <div className="text-center p-3 bg-blue-50 rounded-xl">
                                            <p className="text-xl font-black text-blue-600">{avgScore}</p>
                                            <p className="text-xs text-gray-500">{mgr?.name}'s Team Avg</p>
                                            <p className="text-xs text-gray-400">{mgrTeam.length} member(s)</p>
                                        </div>
                                        <div className="space-y-2">
                                            {mgrTeam.map(emp => {
                                                const score = kpiAnalytics?.all_employees?.find((e: any) => e.employee_id === emp.id);
                                                return (
                                                    <div key={emp.id} className="flex items-center space-x-2">
                                                        <span className="text-xs text-gray-600 w-20 truncate">{emp.name.split(' ')[0]}</span>
                                                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                                                            {score && <div className={`h-2 rounded-full ${score.average_score >= 75 ? 'bg-green-500' : score.average_score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                                                style={{ width: `${score.average_score}%` }} />}
                                                        </div>
                                                        <span className="text-xs font-bold w-8 text-right text-gray-500">{score ? score.average_score : '—'}</span>
                                                    </div>
                                                );
                                            })}
                                            {mgrTeam.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No employees under this manager.</p>}
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
                                <option value="">Select an Employee...</option>
                                {team.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            {kpiSelectedId && (() => {
                                const score = kpiAnalytics?.all_employees?.find((e: any) => e.employee_id === kpiSelectedId);
                                const emp = team.find(e => e.id === kpiSelectedId);
                                return (
                                    <div className="space-y-3">
                                        <div className="text-center p-3 bg-purple-50 rounded-xl">
                                            <p className={`text-3xl font-black ${score ? (score.average_score >= 75 ? 'text-green-600' : score.average_score >= 50 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-400'}`}>
                                                {score ? score.average_score : '—'}
                                            </p>
                                            <p className="text-xs text-gray-500">{emp?.name}'s KPI Score</p>
                                            {score && <p className="text-xs text-gray-400">{score.submissions_count} form(s) submitted</p>}
                                        </div>
                                        {score && (
                                            <div className="w-full bg-gray-100 rounded-full h-3">
                                                <div className={`h-3 rounded-full transition-all ${score.average_score >= 75 ? 'bg-green-500' : score.average_score >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                                    style={{ width: `${score.average_score}%` }} />
                                            </div>
                                        )}
                                        {!score && <p className="text-xs text-gray-400 text-center">No form submissions yet for this employee.</p>}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Assign Task Panel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Assign Task form */}
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 flex flex-col">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2 mb-1">
                        <ClipboardList className="w-5 h-5 text-indigo-500" />
                        <span>Assign Task</span>
                    </h2>
                    <p className="text-xs text-gray-500 mb-4">Send a task to any manager or employee.</p>
                    <div className="flex-1 flex flex-col space-y-3">
                        <select value={taskAssignTo} onChange={e => setTaskAssignTo(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="" disabled>Assign to...</option>
                            <optgroup label="Managers">
                                {allUsers.filter((u: any) => u.role?.toUpperCase() === 'MANAGER').map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name} (Manager)</option>
                                ))}
                            </optgroup>
                            <optgroup label="Employees">
                                {allUsers.filter((u: any) => u.role?.toUpperCase() === 'EMPLOYEE').map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name} (Employee)</option>
                                ))}
                            </optgroup>
                        </select>
                        <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                            placeholder="Task title (required)"
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} rows={2}
                            placeholder="Description (optional)"
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Due Date (optional)</label>
                                <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Link to Project (optional)</label>
                                <select value={taskProjectId} onChange={e => setTaskProjectId(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
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

                {/* Sent Tasks list */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2 mb-4">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span>Assigned Tasks</span>
                        <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{sentTasks.length} total</span>
                    </h2>
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1" style={{ maxHeight: 320 }}>
                        {sentTasks.length > 0 ? sentTasks.map((t: any) => (
                            <div key={t.id} className="group border border-gray-100 rounded-xl hover:border-indigo-100 transition-all">
                                {editTaskId === t.id ? (
                                    /* Inline edit row */
                                    <div className="p-3 space-y-2">
                                        <input value={editTaskForm.title}
                                            onChange={e => setEditTaskForm(f => ({ ...f, title: e.target.value }))}
                                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        <div className="flex space-x-2">
                                            <select value={editTaskForm.status}
                                                onChange={e => setEditTaskForm(f => ({ ...f, status: e.target.value }))}
                                                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
                                                <option value="TODO">TODO</option>
                                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                                <option value="DONE">DONE</option>
                                            </select>
                                            <input type="date" value={editTaskForm.due_date}
                                                onChange={e => setEditTaskForm(f => ({ ...f, due_date: e.target.value }))}
                                                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        <div className="flex space-x-2">
                                            <button onClick={() => setEditTaskId(null)}
                                                className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-1.5 text-xs font-medium hover:bg-gray-50">Cancel</button>
                                            <button onClick={() => handleEditTaskSave(t.id)} disabled={isSavingTaskEdit}
                                                className="flex-1 bg-indigo-600 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-indigo-700 disabled:bg-indigo-300">
                                                {isSavingTaskEdit ? 'Saving…' : 'Save'}
                                            </button>
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
                                            <button onClick={() => { setEditTaskId(t.id); setEditTaskForm({ title: t.title, description: t.description || '', due_date: t.due_date?.split('T')[0] || '', status: t.status }); }}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            </button>
                                            <button onClick={() => { if (confirm(`Delete task "${t.title}"?`)) handleDeleteTask(t.id); }}
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

            {/* Check-in and Recent Responses (Feature Parity with Manager) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                    <h2 className="text-base font-semibold text-gray-900 mb-2">Check-in with Team</h2>
                    <p className="text-xs text-gray-500 mb-4">Send messages, files, or audio notes to employees.</p>

                    <div className="flex-1 flex flex-col space-y-4">
                        {/* Employee select */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
                            <select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                                <button
                                    onClick={async () => {
                                        if (!selectedEmployee) return alert("Please select an employee first.");
                                        setIsGenerating(true);
                                        try {
                                            const res = await api.post(`/questions/generate/${selectedEmployee}`);
                                            setQuestionText(res.data.question_text);
                                        } catch { alert("Failed to generate question."); }
                                        finally { setIsGenerating(false); }
                                    }}
                                    disabled={isGenerating || !selectedEmployee}
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                >
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
                            {/* File picker */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
                                className="hidden"
                                onChange={e => setAttachment(e.target.files?.[0] || null)}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                title="Attach file/image"
                                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-indigo-300 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                <span>Attach File</span>
                            </button>

                            {/* Audio record */}
                            <button
                                type="button"
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
                                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${isRecording
                                    ? 'border-red-400 bg-red-50 text-red-600 animate-pulse'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-indigo-300'
                                    }`}
                            >
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
                                <button onClick={() => setAttachment(null)} className="ml-2 text-red-400 hover:text-red-600 flex-shrink-0 text-lg leading-none">&times;</button>
                            </div>
                        )}

                        {/* Send button */}
                        <button
                            onClick={async () => {
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
                                    setQuestionText('');
                                    setAttachment(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                    const res = await api.get('/questions/');
                                    setQuestions(res.data);
                                } catch (err: any) {
                                    alert('Failed to send: ' + (err.response?.data?.detail || err.message));
                                } finally {
                                    setIsSending(false);
                                }
                            }}
                            disabled={isSending || !selectedEmployee || (!questionText && !attachment)}
                            className="bg-indigo-600 text-white w-full py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-md font-semibold text-sm mt-auto disabled:bg-indigo-300 disabled:cursor-not-allowed"
                        >
                            {isSending ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending...</span></>
                            ) : (
                                <><Send className="w-4 h-4" /><span>Send Message</span></>
                            )}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2 mb-6 text-indigo-900 border-b border-indigo-50 pb-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Recent Team Responses</span>
                    </h2>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {questions.filter(q => q.responses && q.responses.length > 0).map((q: any) => (
                            <div key={q.id} className="border border-gray-100 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Q: {q.question_text || '[Attachment]'}</span>
                                        <span className="text-[10px] text-gray-500 mt-0.5">Asked by: <span className="font-semibold text-indigo-700">{q.creator?.name || 'Unknown'}</span> ({q.creator?.role || 'SYSTEM'})</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium">Emp ID: {q.target_employee}</span>
                                </div>
                                {q.attachment_url && (
                                    <div className="mb-2 ml-0">
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
                                            <span className="text-xs font-semibold text-gray-700">{r.employee_name || 'Employee'}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 pl-7">{r.response_text}</p>
                                    </div>
                                ))}
                            </div>
                        ))}
                        {questions.filter(q => q.responses && q.responses.length > 0).length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-8 italic">No responses from the team yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

