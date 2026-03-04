import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserProfile, TimeEntry } from '../../types';

interface Props { user: UserProfile; }

function fmtDuration(ms: number) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
}
function fmtTime(ms: number) {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(ms: number) {
    return new Date(ms).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function AdminTimePage({ user }: Props) {
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterName, setFilterName] = useState('all');

    useEffect(() => {
        if (!user.orgId) return;
        supabase.from('time_entries').select('*').eq('org_id', user.orgId).order('start_time', { ascending: false }).limit(200)
            .then(({ data }) => {
                if (data) setEntries(data.map(r => ({
                    id: r.id, userId: r.user_id, userName: r.user_name,
                    startTime: r.start_time, endTime: r.end_time, status: r.status,
                    jobName: r.job_name, notes: r.notes, totalPay: r.total_pay, orgId: r.org_id,
                })));
                setLoading(false);
            });
    }, [user.orgId]);

    const names = Array.from(new Set(entries.map(e => e.userName))).sort();
    const filtered = filterName === 'all' ? entries : entries.filter(e => e.userName === filterName);

    // Group by employee for summary
    const summary: Record<string, { hours: number; pay: number; count: number }> = {};
    const weekAgo = Date.now() - 7 * 24 * 3600000;
    for (const e of entries.filter(en => en.startTime >= weekAgo)) {
        const dur = e.endTime ? e.endTime - e.startTime : 0;
        if (!summary[e.userName]) summary[e.userName] = { hours: 0, pay: 0, count: 0 };
        summary[e.userName].hours += dur / 3600000;
        summary[e.userName].pay += e.totalPay ?? 0;
        summary[e.userName].count++;
    }

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Time Tracking</h1>
                <p style={{ margin: 0, color: 'var(--color-text-2)', fontSize: '0.88rem' }}>All time entries and hours worked</p>
            </div>

            {/* Week summary */}
            {Object.keys(summary).length > 0 && (
                <div className="section-card" style={{ marginBottom: 20 }}>
                    <div className="section-card-header">
                        <span className="section-card-title">This Week's Summary</span>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr><th>Employee</th><th>Hours</th><th>Earnings</th><th>Entries</th></tr>
                        </thead>
                        <tbody>
                            {Object.entries(summary).sort(([a], [b]) => a.localeCompare(b)).map(([name, s]) => (
                                <tr key={name}>
                                    <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{name}</td>
                                    <td style={{ fontWeight: 700 }}>{s.hours.toFixed(1)}h</td>
                                    <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>${s.pay.toFixed(2)}</td>
                                    <td style={{ color: 'var(--color-text-3)' }}>{s.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Filter & entries */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                <select className="input" style={{ width: 200 }} value={filterName} onChange={e => setFilterName(e.target.value)}>
                    <option value="all">All Employees</option>
                    {names.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-3)' }}>{filtered.length} entries</span>
            </div>

            {loading && <div className="loading-wrap"><div className="loading-spinner" /></div>}

            <div className="section-card">
                <table className="data-table">
                    <thead>
                        <tr><th>Employee</th><th>Date</th><th>Job</th><th>In</th><th>Out</th><th>Duration</th><th>Pay</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && !loading && (
                            <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-3)', padding: '32px' }}>No time entries found.</td></tr>
                        )}
                        {filtered.map(e => {
                            const dur = e.endTime ? e.endTime - e.startTime : (e.status === 'active' ? Date.now() - e.startTime : 0);
                            return (
                                <tr key={e.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{e.userName}</td>
                                    <td>{fmtDate(e.startTime)}</td>
                                    <td>{e.jobName || '—'}</td>
                                    <td>{fmtTime(e.startTime)}</td>
                                    <td>{e.endTime ? fmtTime(e.endTime) : <span style={{ color: 'var(--color-success)' }}>Now</span>}</td>
                                    <td style={{ fontWeight: 600 }}>{fmtDuration(dur)}</td>
                                    <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{e.totalPay != null ? `$${e.totalPay.toFixed(2)}` : '—'}</td>
                                    <td>
                                        {e.status === 'active'
                                            ? <span className="badge badge-active">Clocked In</span>
                                            : <span className="badge badge-completed">Done</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
