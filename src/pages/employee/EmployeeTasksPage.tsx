import React, { useEffect, useState, useRef } from 'react';
import {
    getTasksByEmployee, updateTaskStatus,
    getSubTasksByTaskId, toggleSubTask, updateSubTaskNotes, updateSubTaskPhoto, getSubTaskCountsByTaskIds,
} from '../../lib/db';
import { UserProfile, Task, SubTask } from '../../types';

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

    // Detail / subtask state
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [subtasks, setSubtasks] = useState<SubTask[]>([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');
    const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
    const [subtaskCounts, setSubtaskCounts] = useState<Record<string, { total: number; done: number }>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [photoTargetId, setPhotoTargetId] = useState<string | null>(null);

    useEffect(() => {
        fetchTasks();
        if (!user.orgId) return;
        const poll = setInterval(fetchTasks, 30000);
        return () => { clearInterval(poll); };
    }, [user.orgId]);

    const fetchTasks = async () => {
        if (!user.orgId) return;
        const data = await getTasksByEmployee(user.orgId, user.name);
        setTasks(data);
        const ids = data.map(t => t.id);
        const counts = await getSubTaskCountsByTaskIds(ids);
        setSubtaskCounts(counts);
        setLoading(false);
    };

    const toggleComplete = async (task: Task, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newStatus = task.status === 'Completed' ? 'In Progress' : 'Completed';
        await updateTaskStatus(task.id, newStatus);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        if (selectedTask?.id === task.id) setSelectedTask(prev => prev ? { ...prev, status: newStatus } : prev);
    };

    const openDetail = async (task: Task) => {
        setSelectedTask(task);
        setLoadingSubs(true);
        setEditingNoteId(null);
        const subs = await getSubTasksByTaskId(task.id);
        setSubtasks(subs);
        setLoadingSubs(false);
    };

    const closeDetail = () => {
        setSelectedTask(null);
        setSubtasks([]);
        setEditingNoteId(null);
    };

    const handleToggleSubtask = async (sub: SubTask) => {
        const newCompleted = !sub.completed;
        await toggleSubTask(sub.id, newCompleted, newCompleted ? user.name : undefined);
        setSubtasks(prev => prev.map(s => s.id === sub.id ? {
            ...s, completed: newCompleted,
            completedBy: newCompleted ? user.name : null,
            completedAt: newCompleted ? Date.now() : null,
        } : s));
        if (selectedTask) {
            setSubtaskCounts(prev => {
                const cur = prev[selectedTask.id] || { total: 0, done: 0 };
                return { ...prev, [selectedTask.id]: { ...cur, done: newCompleted ? cur.done + 1 : cur.done - 1 } };
            });
        }
    };

    const handleSaveNote = async (subId: string) => {
        await updateSubTaskNotes(subId, noteText || null);
        setSubtasks(prev => prev.map(s => s.id === subId ? { ...s, notes: noteText || null } : s));
        setEditingNoteId(null);
        setNoteText('');
    };

    const triggerPhotoUpload = (subId: string) => {
        setPhotoTargetId(subId);
        setTimeout(() => fileInputRef.current?.click(), 50);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !photoTargetId) return;
        setUploadingPhotoId(photoTargetId);
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const dataUrl = reader.result as string;
                await updateSubTaskPhoto(photoTargetId!, dataUrl);
                setSubtasks(prev => prev.map(s => s.id === photoTargetId ? { ...s, photoUrl: dataUrl } : s));
                setUploadingPhotoId(null);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Photo upload error:', err);
            setUploadingPhotoId(null);
        }
        setPhotoTargetId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
            {/* Hidden file input for photo uploads */}
            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePhotoUpload} capture="environment" />

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
                    const counts = subtaskCounts[task.id];
                    return (
                        <div key={task.id} className={`task-card priority-${task.priority.toLowerCase()}${isDone ? ' done' : ''}`} onClick={() => openDetail(task)} style={{ cursor: 'pointer' }}>
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
                                        onClick={(e) => toggleComplete(task, e)}
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
                                {counts && counts.total > 0 && (
                                    <span className="badge" style={{ background: counts.done === counts.total ? '#dcfce7' : '#f1f5f9', color: counts.done === counts.total ? '#166534' : '#64748b' }}>
                                        ☑ {counts.done}/{counts.total}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Task Detail Modal ── */}
            {selectedTask && (
                <div className="modal-backdrop" onClick={closeDetail}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title" style={{ fontSize: '1.05rem' }}>Task Details</h2>
                            <button className="icon-btn" onClick={closeDetail}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                            {/* Task info */}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                                <PriorityBadge p={selectedTask.priority} />
                                <StatusBadge s={selectedTask.status} />
                                <button
                                    className={`btn ${selectedTask.status === 'Completed' ? 'btn-ghost' : 'btn-primary'}`}
                                    style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: '0.8rem' }}
                                    onClick={() => toggleComplete(selectedTask)}
                                >
                                    {selectedTask.status === 'Completed' ? 'Reopen Task' : '✓ Complete Task'}
                                </button>
                            </div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '8px 0 4px' }}>{selectedTask.title}</h3>
                            {selectedTask.description && (
                                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-2)', lineHeight: 1.6, margin: '0 0 12px' }}>{selectedTask.description}</p>
                            )}
                            <div className="detail-meta-grid">
                                {selectedTask.jobName && (
                                    <div className="detail-meta-item">
                                        <span className="detail-meta-label">Job Site</span>
                                        <span className="detail-meta-value">{selectedTask.jobName}</span>
                                    </div>
                                )}
                                {selectedTask.location && (
                                    <div className="detail-meta-item">
                                        <span className="detail-meta-label">Location</span>
                                        <span className="detail-meta-value">{selectedTask.location}</span>
                                    </div>
                                )}
                                {selectedTask.dueDate && (
                                    <div className="detail-meta-item">
                                        <span className="detail-meta-label">Due Date</span>
                                        <span className="detail-meta-value" style={{ color: selectedTask.dueDate < today && selectedTask.status !== 'Completed' ? 'var(--color-danger)' : undefined }}>
                                            {selectedTask.dueDate}
                                            {selectedTask.dueDate < today && selectedTask.status !== 'Completed' ? ' — Overdue' : ''}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Subtasks / Checklist */}
                            <div className="subtask-section" style={{ marginTop: 16 }}>
                                <div className="subtask-section-header">
                                    <label className="input-label" style={{ margin: 0, fontSize: '0.92rem' }}>
                                        Checklist
                                        {subtasks.length > 0 && (
                                            <span style={{ fontWeight: 400, color: 'var(--color-text-3)', marginLeft: 6 }}>
                                                ({subtasks.filter(s => s.completed).length}/{subtasks.length} done)
                                            </span>
                                        )}
                                    </label>
                                </div>

                                {/* Progress bar */}
                                {subtasks.length > 0 && (
                                    <div className="subtask-progress-bar">
                                        <div
                                            className="subtask-progress-fill"
                                            style={{ width: `${(subtasks.filter(s => s.completed).length / subtasks.length) * 100}%` }}
                                        />
                                    </div>
                                )}

                                {loadingSubs && <div className="loading-wrap" style={{ padding: 20 }}><div className="loading-spinner" /></div>}

                                {!loadingSubs && subtasks.length === 0 && (
                                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-3)', margin: '8px 0', textAlign: 'center' }}>No checklist items for this task.</p>
                                )}

                                {!loadingSubs && subtasks.length > 0 && (
                                    <div className="subtask-list employee-subtask-list">
                                        {subtasks.map(sub => (
                                            <div key={sub.id} className={`subtask-item employee${sub.completed ? ' completed' : ''}`}>
                                                <div className="subtask-main-row">
                                                    <button className="subtask-checkbox" onClick={() => handleToggleSubtask(sub)}>
                                                        {sub.completed
                                                            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-success)" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 12l2 2 4-4" /></svg>
                                                            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-border)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                                                        }
                                                    </button>
                                                    <div className="subtask-content">
                                                        <span className={`subtask-title${sub.completed ? ' done' : ''}`}>{sub.title}</span>
                                                        {sub.completedBy && (
                                                            <span className="subtask-done-by">Done by {sub.completedBy}</span>
                                                        )}
                                                    </div>
                                                    <div className="subtask-actions">
                                                        <button
                                                            className="icon-btn"
                                                            onClick={() => triggerPhotoUpload(sub.id)}
                                                            title="Upload photo"
                                                            disabled={uploadingPhotoId === sub.id}
                                                        >
                                                            {uploadingPhotoId === sub.id
                                                                ? <div className="loading-spinner" style={{ width: 14, height: 14 }} />
                                                                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                                                            }
                                                        </button>
                                                        <button
                                                            className="icon-btn"
                                                            onClick={() => {
                                                                if (editingNoteId === sub.id) {
                                                                    setEditingNoteId(null);
                                                                } else {
                                                                    setEditingNoteId(sub.id);
                                                                    setNoteText(sub.notes || '');
                                                                }
                                                            }}
                                                            title="Add note"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Photo preview */}
                                                {sub.photoUrl && (
                                                    <div className="subtask-photo-wrap">
                                                        <img src={sub.photoUrl} alt="Subtask photo" className="subtask-photo" onClick={() => window.open(sub.photoUrl!, '_blank')} />
                                                    </div>
                                                )}

                                                {/* Notes display / edit */}
                                                {sub.notes && editingNoteId !== sub.id && (
                                                    <div className="subtask-notes-display" onClick={() => { setEditingNoteId(sub.id); setNoteText(sub.notes || ''); }}>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontWeight: 600 }}>Note:</span>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-2)' }}>{sub.notes}</span>
                                                    </div>
                                                )}
                                                {editingNoteId === sub.id && (
                                                    <div className="subtask-note-edit">
                                                        <textarea
                                                            className="input"
                                                            rows={2}
                                                            placeholder="Add a note…"
                                                            value={noteText}
                                                            onChange={e => setNoteText(e.target.value)}
                                                            autoFocus
                                                            style={{ fontSize: '0.82rem', resize: 'vertical' }}
                                                        />
                                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setEditingNoteId(null)}>Cancel</button>
                                                            <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => handleSaveNote(sub.id)}>Save Note</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={closeDetail}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
