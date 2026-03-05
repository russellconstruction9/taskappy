import React, { useEffect, useState, useCallback } from 'react';
import {
    getTasksByOrg, getEmployeesByOrg, getActiveJobsByOrg,
    createTask, updateTask, deleteTask as removeTask,
    getSubTasksByTaskId, createSubTask, deleteSubTask, getSubTaskCountsByTaskIds,
} from '../../lib/db';
import { UserProfile, Task, SubTask, Job } from '../../types';
import Modal from '../../components/Modal';
import AlertDialog from '../../components/AlertDialog';
import { SearchIcon, DeleteIcon, CloseIcon, CheckboxIcon, UserIcon, LocationIcon, CalendarIcon } from '../../components/icons';
import { useForm } from '../../hooks/useForm';
import { useModal } from '../../hooks/useModal';

interface Props { user: UserProfile; }

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Pending', 'In Progress', 'Blocked', 'Completed'];

const INITIAL_FORM = {
    title: '', description: '', location: '',
    assignedTo: '', dueDate: '', priority: 'Medium', status: 'Pending', jobName: '',
};

export default function AdminTasksPage({ user }: Props) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Task | null>(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');

    const modal = useModal();
    const form = useForm(INITIAL_FORM);

    // Subtask state
    const [subtasks, setSubtasks] = useState<SubTask[]>([]);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [addingSubtask, setAddingSubtask] = useState(false);
    const [subtaskCounts, setSubtaskCounts] = useState<Record<string, { total: number; done: number }>>({});

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
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
    }, [user.orgId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openCreate = () => {
        setEditing(null);
        form.reset();
        setSubtasks([]);
        setNewSubtaskTitle('');
        modal.show();
    };
    const openEdit = async (task: Task) => {
        setEditing(task);
        form.reset({
            title: task.title, description: task.description, location: task.location,
            assignedTo: task.assignedTo, dueDate: task.dueDate, priority: task.priority,
            status: task.status, jobName: task.jobName ?? '',
        });
        setNewSubtaskTitle('');
        modal.show();
        const subs = await getSubTasksByTaskId(task.id);
        setSubtasks(subs);
    };

    const handleSave = async () => {
        if (!form.values.title.trim()) return;
        modal.setSaving(true);
        const payload = {
            title: form.values.title, description: form.values.description,
            location: form.values.location, assignedTo: form.values.assignedTo,
            dueDate: form.values.dueDate || null, priority: form.values.priority,
            status: form.values.status, jobName: form.values.jobName || null, orgId: user.orgId,
        };
        if (editing) {
            await updateTask(editing.id, payload);
        } else {
            await createTask(payload);
        }
        modal.hide();
        fetchAll();
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        await removeTask(deleteTarget);
        setTasks(prev => prev.filter(t => t.id !== deleteTarget));
        setDeleteTarget(null);
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
                <h1>Tasks</h1>
                <p>{tasks.length} total tasks</p>
            </div>

            <div className="toolbar">
                <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
                    <SearchIcon />
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
                                    <button className="icon-btn danger" onClick={() => setDeleteTarget(task.id)} title="Delete" aria-label="Delete task">
                                        <DeleteIcon />
                                    </button>
                                </div>
                            </div>
                            <div className="task-card-meta">
                                {task.assignedTo && (
                                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <UserIcon size={12} /> {task.assignedTo}
                                    </span>
                                )}
                                {task.jobName && (
                                    <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-2)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                        <LocationIcon size={11} /> {task.jobName}
                                    </span>
                                )}
                                {task.dueDate && (
                                    <span style={{ fontSize: '0.75rem', color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-3)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                        <CalendarIcon size={11} /> {task.dueDate}{isOverdue ? ' — Overdue' : ''}
                                    </span>
                                )}
                                {(() => { const counts = subtaskCounts[task.id]; return counts && counts.total > 0 ? (
                                    <span className="badge" style={{ background: counts.done === counts.total ? '#f0fdfa' : '#f1f5f9', color: counts.done === counts.total ? '#0f766e' : '#64748b' }}>
                                        {counts.done}/{counts.total} items
                                    </span>
                                ) : null; })()}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal
                open={modal.open}
                onClose={modal.hide}
                title={editing ? 'Edit Task' : 'New Task'}
                maxWidth="lg"
                footer={
                    <>
                        <button className="btn btn-ghost" onClick={modal.hide}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={modal.saving || !form.values.title.trim()}>
                            {modal.saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Task'}
                        </button>
                    </>
                }
            >
                <div style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="input-group">
                        <label className="input-label">Title *</label>
                        <input className="input" placeholder="Task title" value={form.values.title} onChange={form.handleChange('title')} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Description</label>
                        <textarea className="input" rows={3} placeholder="Task details…" value={form.values.description} onChange={form.handleChange('description')} style={{ resize: 'vertical' }} />
                    </div>
                    <div className="grid-2">
                        <div className="input-group">
                            <label className="input-label">Assign To</label>
                            <select className="input" value={form.values.assignedTo} onChange={form.handleChange('assignedTo')}>
                                <option value="">Unassigned</option>
                                {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Job Site</label>
                            <select className="input" value={form.values.jobName} onChange={form.handleChange('jobName')}>
                                <option value="">None</option>
                                {jobs.map(j => <option key={j.id} value={j.name}>{j.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid-2">
                        <div className="input-group">
                            <label className="input-label">Priority</label>
                            <select className="input" value={form.values.priority} onChange={form.handleChange('priority')}>
                                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Status</label>
                            <select className="input" value={form.values.status} onChange={form.handleChange('status')}>
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid-2">
                        <div className="input-group">
                            <label className="input-label">Due Date</label>
                            <input type="date" className="input" value={form.values.dueDate} onChange={form.handleChange('dueDate')} />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Location</label>
                            <input className="input" placeholder="Job location" value={form.values.location} onChange={form.handleChange('location')} />
                        </div>
                    </div>

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
                                                <CheckboxIcon checked={sub.completed} />
                                            </div>
                                            <span className="subtask-title">{sub.title}</span>
                                            {sub.photoUrl && <span style={{ fontSize: '0.72rem', color: 'var(--color-text-3)' }}>Photo</span>}
                                            <button className="icon-btn danger subtask-delete" onClick={() => handleDeleteSubtask(sub.id)} title="Remove" aria-label="Remove checklist item">
                                                <CloseIcon />
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
            </Modal>

            <AlertDialog
                open={deleteTarget !== null}
                title="Delete Task"
                message="Delete this task and all its checklist items? This cannot be undone."
                confirmLabel="Delete"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                destructive
            />
        </div>
    );
}
