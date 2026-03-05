import React, { useEffect, useState } from 'react';
import { getTasksByEmployee, updateTaskStatus } from '../../lib/db';
import { UserProfile, Task } from '../../types';

interface Props { user: UserProfile; }

const PriorityBadge = ({ p }: { p: string }) => {
    const cls = p === 'Critical' ? 'badge-critical' : p === 'High' ? 'badge-high' : p === 'Medium' ? 'badge-medium' : 'badge-low';
    return <span className={`badge ${cls}`}>{p}</span>;
};
const StatusBadge = ({ s }: { s: string }) => {
    const cls = s === 'Completed' ? 'badge-completed' : s === 'In Progress' ? 'badge-progress' : s === 'Blocked' ? 'badge-blocked' : 'badge-pending';
    return <span className={`badge ${cls}`}>{s}</span>;
};
const CalIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);
const BriefIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
);
const CheckIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
    </svg>
);

type Filter = 'active' | 'completed';

export default function EmployeeTasksPage({ user }: Props) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filter, setFilter] = useState<Filter>('active');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
        // Poll for updates
        if (!user.orgId) return;
        const poll = setInterval(fetchTasks, 30000);
        return () => { clearInterval(poll); };
    }, [user.orgId]);

    const fetchTasks = async () => {
        if (!user.orgId) return;
        const data = await getTasksByEmployee(user.orgId, user.name);
        setTasks(data);
        setLoading(false);
    };

    const toggleComplete = async (task: Task) => {
        const newStatus = task.status === 'Completed' ? 'In Progress' : 'Completed';
        await updateTaskStatus(task.id, newStatus);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    };

    const filtered = tasks.filter(t => {
        const isCompleted = t.status === 'Completed';
        if (filter === 'active' && isCompleted) return false;
        if (filter === 'completed' && !isCompleted) return false;
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const today = new Date().toISOString().split('T')[0];

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h1 className="page-title">My Tasks</h1>
                <p className="page-sub">Tasks assigned to you, {user.name}</p>
            </div>

            <div className="task-list-toolbar">
                <div className="filter-tabs">
                    <button className={`filter-tab${filter === 'active' ? ' active' : ''}`} onClick={() => setFilter('active')}>Active</button>
                    <button className={`filter-tab${filter === 'completed' ? ' active' : ''}`} onClick={() => setFilter('completed')}>Done</button>
                </div>
                <div className="search-wrap">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input className="input search-wrap" style={{ paddingLeft: 34 }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {loading && <div className="loading-wrap"><div className="loading-spinner" /></div>}

            {!loading && filtered.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" /></svg>
                    </div>
                    <p>{filter === 'active' ? 'No active tasks assigned to you.' : 'No completed tasks yet.'}</p>
                </div>
            )}

            <div className="task-list">
                {filtered.map(task => {
                    const isDone = task.status === 'Completed';
                    const isOverdue = task.dueDate && task.dueDate < today && !isDone;
                    return (
                        <div key={task.id} className={`task-card priority-${task.priority.toLowerCase()}${isDone ? ' done' : ''}`}>
                            <div className="task-card-header">
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                                        <PriorityBadge p={task.priority} />
                                        <StatusBadge s={task.status} />
                                    </div>
                                    <div className="task-card-title">{task.title || 'Untitled'}</div>
                                </div>
                                <div className="task-card-actions">
                                    <button
                                        className={`icon-btn${isDone ? '' : ' success'}`}
                                        onClick={() => toggleComplete(task)}
                                        title={isDone ? 'Mark active' : 'Mark complete'}
                                    >
                                        <CheckIcon />
                                    </button>
                                </div>
                            </div>
                            {task.description && (
                                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-2)', margin: '4px 0 8px', lineHeight: 1.5 }}>{task.description}</p>
                            )}
                            <div className="task-card-meta">
                                {task.jobName && (
                                    <span className="badge" style={{ background: '#fff7ed', color: 'var(--color-brand)' }}>
                                        <BriefIcon /> {task.jobName}
                                    </span>
                                )}
                                {task.dueDate && (
                                    <span className="badge" style={{ background: isOverdue ? '#fee2e2' : '#f1f5f9', color: isOverdue ? '#dc2626' : 'var(--color-text-2)' }}>
                                        <CalIcon /> {task.dueDate}{isOverdue ? ' — Overdue' : ''}
                                    </span>
                                )}
                                {task.location && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>📍 {task.location}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
