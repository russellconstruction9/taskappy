import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { UserProfile, Task, TimeEntry, AdminView } from '../../types';

interface Props {
    user: UserProfile;
    onNavigate: (view: AdminView) => void;
}

function fmtDuration(ms: number) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
}
function elapsed(startTime: number) { return Date.now() - startTime; }

export default function AdminDashboardPage({ user, onNavigate }: Props) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activeEntries, setActiveEntries] = useState<TimeEntry[]>([]);
    const [now, setNow] = useState(Date.now());
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user.orgId) return;
        const [{ data: taskData }, { data: timeData }] = await Promise.all([
            supabase.from('tasks').select('*').eq('org_id', user.orgId),
            supabase.from('time_entries').select('*').eq('org_id', user.orgId).eq('status', 'active'),
        ]);
        if (taskData) setTasks(taskData.map(r => ({
            id: r.id, title: r.title, description: r.description ?? '', location: r.location ?? '',
            assignedTo: r.assigned_to ?? '', dueDate: r.due_date ?? '', priority: r.priority ?? 'Medium',
            status: r.status ?? 'Pending', createdAt: r.created_at ?? 0, jobName: r.job_name,
        })));
        if (timeData) setActiveEntries(timeData.map(r => ({
            id: r.id, userId: r.user_id, userName: r.user_name,
            startTime: r.start_time, endTime: r.end_time, status: r.status,
            jobName: r.job_name, notes: r.notes, orgId: r.org_id,
        })));
        setLoading(false);
    }, [user.orgId]);

    useEffect(() => {
        fetchData();
        // tick
        const tick = setInterval(() => setNow(Date.now()), 10000);
        // realtime
        if (!user.orgId) return;
        const ch = supabase.channel(`admin-dash-${user.orgId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries', filter: `org_id=eq.${user.orgId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `org_id=eq.${user.orgId}` }, fetchData)
            .subscribe();
        return () => { clearInterval(tick); supabase.removeChannel(ch); };
    }, [fetchData]);

    const today = new Date().toISOString().split('T')[0];
    const activeTasks = tasks.filter(t => t.status !== 'Completed');
    const completedTasks = tasks.filter(t => t.status === 'Completed');
    const dueToday = tasks.filter(t => t.dueDate === today && t.status !== 'Completed');
    const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'Completed');

    if (loading) return <div className="loading-wrap"><div className="loading-spinner" /></div>;

    return (
        <div>
            <div className="admin-header">
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
                    Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user.name} 👋
                </h1>
                <p style={{ margin: 0, color: 'var(--color-text-2)', fontSize: '0.9rem' }}>Here's what's happening with your team today.</p>
            </div>

            {/* Stat cards */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-label">Working Now</div>
                    <div className="stat-value brand">{activeEntries.length}</div>
                    <div className="stat-desc">employees clocked in</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Active Tasks</div>
                    <div className="stat-value">{activeTasks.length}</div>
                    <div className="stat-desc">total open tasks</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Due Today</div>
                    <div className="stat-value" style={{ color: dueToday.length > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>{dueToday.length}</div>
                    <div className="stat-desc">tasks due today</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Overdue</div>
                    <div className="stat-value danger">{overdue.length}</div>
                    <div className="stat-desc">past due date</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Completed</div>
                    <div className="stat-value success">{completedTasks.length}</div>
                    <div className="stat-desc">tasks finished</div>
                </div>
            </div>

            {/* Active workers */}
            <div className="section-card" style={{ marginBottom: 20 }}>
                <div className="section-card-header">
                    <span className="section-card-title">🟢 Active Workers</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('time')}>View All Time →</button>
                </div>
                <div className="section-card-body">
                    {activeEntries.length === 0 && (
                        <p style={{ color: 'var(--color-text-3)', fontSize: '0.88rem', textAlign: 'center', padding: '12px 0' }}>No employees currently clocked in.</p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {activeEntries.map(entry => (
                            <div key={entry.id} className="worker-card">
                                <div className="worker-avatar">{entry.userName.charAt(0).toUpperCase()}</div>
                                <div className="worker-info">
                                    <div className="worker-name">{entry.userName}</div>
                                    <div className="worker-job">{entry.jobName || 'No job selected'}</div>
                                </div>
                                <div className="worker-time">{fmtDuration(now - entry.startTime)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tasks needing attention */}
            {(dueToday.length > 0 || overdue.length > 0) && (
                <div className="section-card">
                    <div className="section-card-header">
                        <span className="section-card-title">⚠️ Needs Attention</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('tasks')}>Manage Tasks →</button>
                    </div>
                    <div>
                        {[...overdue, ...dueToday].slice(0, 8).map(task => (
                            <div key={task.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--color-border)', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text)' }}>{task.title}</div>
                                    <div style={{ fontSize: '0.76rem', color: 'var(--color-text-3)', marginTop: 2 }}>
                                        {task.assignedTo || 'Unassigned'} · {task.dueDate}
                                    </div>
                                </div>
                                <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
