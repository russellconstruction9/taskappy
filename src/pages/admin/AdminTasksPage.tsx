import React, { useEffect, useState } from 'react';
import {
    getTasksByOrg, getEmployeesByOrg, getActiveJobsByOrg,
    createTask, updateTask, deleteTask as removeTask,
    getSubTasksByTaskId, createSubTask, deleteSubTask, getSubTaskCountsByTaskIds,
} from '../../lib/db';
import { UserProfile, Task, SubTask, Job } from '../../types';

interface Props { user: UserProfile; }

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Pending', 'In Progress', 'Blocked', 'Completed'];

interface TaskFormData {
    title: string; description: string; location: string;
    assignedTo: string; dueDate: string; priority: string; status: string; jobName: string;
}

export default function AdminTasksPage({ user }: Props) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Task | null>(null);
    const [form, setForm] = useState<TaskFormData>({ title: '', description: '', location: '', assignedTo: '', dueDate: '', priority: 'Medium', status: 'Pending', jobName: '' });
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');

    // Subtask state
    const [subtasks, setSubtasks] = useState<SubTask[]>([]);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [addingSubtask, setAddingSubtask] = useState(false);
    const [subtaskCounts, setSubtaskCounts] = useState<Record<string, { total: number; done: number }>>({});

    useEffect(() => { fetchAll(); }, [user.orgId]);

    const fetchAll = async () => {
        if (!user.orgId) return;
        const [t, e, j] = await Promise.all([
            getTasksByOrg(user.orgId),
            getEmployeesByOrg(user.orgId),
            getActiveJobsByOrg(user.orgId),
        ]);
        setTasks(t);
        setEmployees(e);
        setJobs(j);
        // Fetch subtask counts
        const ids = t.map(tk => tk.id);
        const counts = await getSubTaskCountsByTaskIds(ids);
        setSubtaskCounts(counts);
        setLoading(false);
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ title: '', description: '', location: '', assignedTo: '', dueDate: '', priority: 'Medium', status: 'Pending', jobName: '' });
        setSubtasks([]);
        setNewSubtaskTitle('');
        setShowModal(true);
    };
    const openEdit = async (task: Task) => {
        setEditing(task);
        setForm({ title: task.title, description: task.description, location: task.location, assignedTo: task.assignedTo, dueDate: task.dueDate, priority: task.priority, status: task.status, jobName: task.jobName ?? '' });
        setNewSubtaskTitle('');
        setShowModal(true);
        const subs = await getSubTasksByTaskId(task.id);
        setSubtasks(subs);
    };

    const handleSave = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        const payload = { title: form.title, description: form.description, location: form.location, assignedTo: form.assignedTo, dueDate: form.dueDate || null, priority: form.priority, status: form.status, jobName: form.jobName || null, orgId: user.orgId };
        if (editing) {
            await updateTask(editing.id, payload);
        } else {
            await createTask(payload);
        }
        setShowModal(false);
        fetchAll();
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this task and all its checklist items?')) return;
        await removeTask(id);
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    const handleAddSubtask = async () => {
        if (!newSubtaskTitle.trim() || !editing) return;
        setAddingSubtask(true);
        const sub = await createSubTask({ taskId: editing.id, title: newSubtaskTitle.trim(), sortOrder: subtasks.length });
        setSubtasks(prev => [...prev, sub]);
        setNewSubtaskTitle('');
        setAddingSubtask(false);
        setSubtaskCounts(prev => {
            const cur = prev[editing.id] || { total: 0, done: 0 };
            return { ...prev, [editing.id]: { ...cur, total: cur.total + 1 } };
        });
    };

    const handleDeleteSubtask = async (subId: string) => {
        if (!editing) return;
        const sub = subtasks.find(s => s.id === subId);
        await deleteSubTask(subId);
        setSubtasks(prev => prev.filter(s => s.id !== subId));
        setSubtaskCounts(prev => {
            const cur = prev[editing.id] || { total: 0, done: 0 };
            return {
                ...prev,
                [editing.id]: {
                    total: Math.max(0, cur.total - 1),
                    done: sub?.completed ? Math.max(0, cur.done - 1) : cur.done,
                },
            };
        });
    };

    const filtered = tasks.filter(t => {
        if (filterStatus !== 'all' && t.status !== filterStatus) return false;
        if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.assignedTo.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const today = new Date().toISOString().split('T')[0];

    return (
        <div>
            <div className="admin-header">
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Tasks</h1>
                <p style={{ margin: 0, color: 'var(--color-text-2)', fontSize: '0.88rem' }}>{tasks.length} total tasks</p>
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input className="input" style={{ paddingLeft: 34 }} placeholder="Search tasks or employees…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All Statuses</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="btn btn-primary" onClick={openCreate}>+ New Task</button>
            </div>

            {loading && <div className="loading-wrap"><div className="loading-spinner" /></div>}

            {!loading && filtered.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" /></svg></div>
                    <p>{search || filterStatus !== 'all' ? 'No tasks match your filters.' : 'No tasks yet. Create the first one!'}</p>
                </div>
            )}

            <div className="task-list">
                {filtered.map(task => {
                    const isDone = task.status === 'Completed';
                    const isOverdue = task.dueDate && task.dueDate < today && !isDone;
                    return (
                        <div key={task.id} className={`task-card priority-${task.priority.toLowerCase()}${isDone ? ' done' : ''}`} onClick={() => openEdit(task)}>
                            <div className="task-card-header">
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                                        <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                                        <span className={`badge badge-${isDone ? 'completed' : task.status === 'In Progress' ? 'progress' : task.status === 'Blocked' ? 'blocked' : 'pending'}`}>{task.status}</span>
                                    </div>
                                    <div className="task-card-title">{task.title}</div>
                                </div>
                                <div className="task-card-actions" onClick={e => e.stopPropagation()}>
                                    <button className="icon-btn danger" onClick={() => handleDelete(task.id)} title="Delete">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="task-card-meta">
                                {task.assignedTo && <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-2)' }}>👤 {task.assignedTo}</span>}
                                {task.jobName && <span className="badge" style={{ background: '#fff7ed', color: 'var(--color-brand)' }}>📍 {task.jobName}</span>}
                                {task.dueDate && <span style={{ fontSize: '0.75rem', color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-3)' }}>📅 {task.dueDate}{isOverdue ? ' — Overdue' : ''}</span>}
                                {(() => { const counts = subtaskCounts[task.id]; return counts && counts.total > 0 ? (
                                    <span className="badge" style={{ background: counts.done === counts.total ? '#dcfce7' : '#f1f5f9', color: counts.done === counts.total ? '#166534' : '#64748b' }}>
                                        ☑ {counts.done}/{counts.total} items
                                    </span>
                                ) : null; })()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Task Modal */}
            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editing ? 'Edit Task' : 'New Task'}</h2>
                            <button className="icon-btn" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="input-group">
                                <label className="input-label">Title *</label>
                                <input className="input" placeholder="Task title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Description</label>
                                <textarea className="input" rows={3} placeholder="Task details…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
                            </div>
                            <div className="grid-2">
                                <div className="input-group">
                                    <label className="input-label">Assign To</label>
                                    <select className="input" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
                                        <option value="">Unassigned</option>
                                        {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Job Site</label>
                                    <select className="input" value={form.jobName} onChange={e => setForm(f => ({ ...f, jobName: e.target.value }))}>
                                        <option value="">None</option>
                                        {jobs.map(j => <option key={j.id} value={j.name}>{j.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="input-group">
                                    <label className="input-label">Priority</label>
                                    <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Status</label>
                                    <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="input-group">
                                    <label className="input-label">Due Date</label>
                                    <input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Location</label>
                                    <input className="input" placeholder="Job location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                                </div>
                            </div>

                            {/* ── Subtasks / Line Items (only when editing) ── */}
                            {editing && (
                                <div className="subtask-section">
                                    <div className="subtask-section-header">
                                        <label className="input-label" style={{ margin: 0 }}>
                                            Checklist Items
                                            {subtasks.length > 0 && <span style={{ fontWeight: 400, color: 'var(--color-text-3)', marginLeft: 6 }}>
                                                ({subtasks.filter(s => s.completed).length}/{subtasks.length} done)
                                            </span>}
                                        </label>
                                    </div>

                                    {subtasks.length > 0 && (
                                        <div className="subtask-list">
                                            {subtasks.map(sub => (
                                                <div key={sub.id} className={`subtask-item${sub.completed ? ' completed' : ''}`}>
                                                    <div className="subtask-check">
                                                        {sub.completed
                                                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-success)" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 12l2 2 4-4" /></svg>
                                                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                                                        }
                                                    </div>
                                                    <span className="subtask-title">{sub.title}</span>
                                                    {sub.photoUrl && <span style={{ fontSize: '0.72rem', color: 'var(--color-text-3)' }}>📷</span>}
                                                    <button className="icon-btn danger subtask-delete" onClick={() => handleDeleteSubtask(sub.id)} title="Remove">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="subtask-add-row">
                                        <input
                                            className="input"
                                            placeholder="Add a checklist item…"
                                            value={newSubtaskTitle}
                                            onChange={e => setNewSubtaskTitle(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                                        />
                                        <button
                                            className="btn btn-primary"
                                            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                                            onClick={handleAddSubtask}
                                            disabled={addingSubtask || !newSubtaskTitle.trim()}
                                        >
                                            {addingSubtask ? '…' : '+ Add'}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {!editing && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', margin: '4px 0 0', fontStyle: 'italic' }}>
                                    Save the task first, then click it to add checklist items.
                                </p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
                                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
