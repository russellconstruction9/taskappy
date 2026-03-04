import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserProfile, Task } from '../../types';

interface Props { user: UserProfile; }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function EmployeeSchedulePage({ user }: Props) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (!user.orgId) return;
        supabase.from('tasks').select('*').eq('org_id', user.orgId).eq('assigned_to', user.name)
            .then(({ data }) => {
                if (data) setTasks(data.map(r => ({
                    id: r.id, title: r.title, description: r.description ?? '', location: r.location ?? '',
                    assignedTo: r.assigned_to ?? '', dueDate: r.due_date ?? '', priority: r.priority ?? 'Medium',
                    status: r.status ?? 'Pending', createdAt: r.created_at ?? 0, jobName: r.job_name,
                })));
            });
    }, [user.orgId]);

    // Build calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: string | null; day: number | null; otherMonth: boolean }[] = [];

    for (let i = 0; i < firstDay; i++) {
        const d = new Date(year, month, -firstDay + i + 1);
        cells.push({ date: d.toISOString().split('T')[0], day: d.getDate(), otherMonth: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({ date, day: d, otherMonth: false });
    }
    while (cells.length % 7 !== 0) {
        const d = new Date(year, month + 1, cells.length - firstDay - daysInMonth + 1);
        cells.push({ date: d.toISOString().split('T')[0], day: d.getDate(), otherMonth: true });
    }

    const tasksByDate: Record<string, Task[]> = {};
    for (const t of tasks) {
        if (t.dueDate) {
            if (!tasksByDate[t.dueDate]) tasksByDate[t.dueDate] = [];
            tasksByDate[t.dueDate].push(t);
        }
    }

    const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
    const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

    const selectedTasks = selectedDate ? (tasksByDate[selectedDate] ?? []) : [];

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h1 className="page-title">Schedule</h1>
                <p className="page-sub">Your task calendar</p>
            </div>

            {/* Month navigator */}
            <div className="section-card" style={{ marginBottom: 16 }}>
                <div className="section-card-body" style={{ padding: '16px' }}>
                    <div className="cal-month-nav">
                        <button className="icon-btn" onClick={prev} style={{ fontSize: '1.2rem', fontWeight: 700 }}>‹</button>
                        <span className="cal-month-title">{MONTHS[month]} {year}</span>
                        <button className="icon-btn" onClick={next} style={{ fontSize: '1.2rem', fontWeight: 700 }}>›</button>
                    </div>

                    <div className="cal-grid" style={{ marginBottom: 6 }}>
                        {DAYS.map(d => <div key={d} className="cal-header-cell">{d}</div>)}
                    </div>
                    <div className="cal-grid">
                        {cells.map((cell, i) => (
                            <div
                                key={i}
                                className={`cal-cell${cell.otherMonth ? ' other-month' : ''}${cell.date === today ? ' today' : ''}${cell.date && tasksByDate[cell.date]?.length ? ' has-tasks' : ''}${cell.date === selectedDate ? ' today' : ''}`}
                                onClick={() => cell.date && setSelectedDate(cell.date === selectedDate ? null : cell.date)}
                            >
                                <span className="cal-day">{cell.day}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Selected day tasks */}
            {selectedDate && (
                <div className="section-card">
                    <div className="section-card-header">
                        <span className="section-card-title">
                            Tasks for {new Date(selectedDate + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                        </span>
                    </div>
                    {selectedTasks.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '0.85rem' }}>No tasks due this day.</div>
                    )}
                    {selectedTasks.map(t => (
                        <div key={t.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>{t.title}</div>
                                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-3)', marginTop: 2 }}>{t.jobName || t.location || ''}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                                <span className={`badge badge-${t.status === 'Completed' ? 'completed' : t.status === 'In Progress' ? 'progress' : 'pending'}`}>{t.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
