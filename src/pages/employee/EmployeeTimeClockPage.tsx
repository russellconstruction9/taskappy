import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserProfile, TimeEntry, Job } from '../../types';

interface Props { user: UserProfile; }

function fmtDuration(ms: number) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function fmtTime(ms: number) {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(ms: number) {
    return new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function EmployeeTimeClockPage({ user }: Props) {
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
    const [selectedJob, setSelectedJob] = useState('');
    const [notes, setNotes] = useState('');
    const [elapsed, setElapsed] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [now, setNow] = useState(Date.now);

    useEffect(() => {
        fetchData();
        const tick = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(tick);
    }, []);

    useEffect(() => {
        if (activeEntry) {
            setElapsed(now - activeEntry.startTime);
        } else {
            setElapsed(0);
        }
    }, [now, activeEntry]);

    const fetchData = async () => {
        const [{ data: entriesData }, { data: jobsData }] = await Promise.all([
            supabase.from('time_entries').select('*').eq('user_id', user.id).order('start_time', { ascending: false }).limit(30),
            supabase.from('jobs').select('*').eq('org_id', user.orgId).eq('active', true),
        ]);
        if (entriesData) {
            const mapped: TimeEntry[] = entriesData.map(r => ({
                id: r.id, userId: r.user_id, userName: r.user_name,
                startTime: r.start_time, endTime: r.end_time, status: r.status,
                jobName: r.job_name, notes: r.notes, totalPay: r.total_pay, orgId: r.org_id,
            }));
            setEntries(mapped);
            const active = mapped.find(e => e.status === 'active');
            if (active) { setActiveEntry(active); setSelectedJob(active.jobName ?? ''); }
        }
        if (jobsData) setJobs(jobsData.map(r => ({ id: r.id, name: r.name, address: r.address ?? '', active: r.active })));
        setLoading(false);
    };

    const clockIn = async () => {
        if (!selectedJob) { alert('Please select a job before clocking in.'); return; }
        setSaving(true);
        const startTime = Date.now();
        const { data, error } = await supabase.from('time_entries').insert({
            user_id: user.id, user_name: user.name,
            start_time: startTime, status: 'active',
            job_name: selectedJob, org_id: user.orgId,
        }).select().single();
        if (!error && data) {
            const entry: TimeEntry = { id: data.id, userId: data.user_id, userName: data.user_name, startTime: data.start_time, endTime: null, status: 'active', jobName: data.job_name, orgId: data.org_id };
            setActiveEntry(entry);
            setEntries(prev => [entry, ...prev]);
        }
        setSaving(false);
    };

    const clockOut = async () => {
        if (!activeEntry) return;
        setSaving(true);
        const endTime = Date.now();
        const hours = (endTime - activeEntry.startTime) / 3600000;
        const totalPay = +(hours * user.rate).toFixed(2);
        await supabase.from('time_entries').update({
            end_time: endTime, status: 'completed', total_pay: totalPay, notes,
        }).eq('id', activeEntry.id);
        setActiveEntry(null);
        setNotes('');
        fetchData();
        setSaving(false);
    };

    const todayEntries = entries.filter(e => fmtDate(e.startTime) === fmtDate(Date.now()));
    const todayMs = todayEntries.reduce((acc, e) => acc + ((e.endTime ?? Date.now()) - e.startTime), 0);
    const todayPay = todayEntries.reduce((acc, e) => acc + (e.totalPay ?? 0), 0) + (activeEntry ? ((elapsed / 3600000) * user.rate) : 0);

    if (loading) return <div className="loading-wrap"><div className="loading-spinner" /></div>;

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h1 className="page-title">Time Clock</h1>
                <p className="page-sub">Clock in and out for your shift</p>
            </div>

            {/* Clock hero */}
            <div className="clock-hero">
                <div className="clock-time">{activeEntry ? fmtDuration(elapsed) : '00:00:00'}</div>
                <div className="clock-label">{activeEntry ? `Clocked in · ${activeEntry.jobName}` : 'Not clocked in'}</div>

                {!activeEntry && (
                    <div style={{ marginBottom: 20, maxWidth: 260, margin: '0 auto 20px' }}>
                        <select className="input" value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
                            style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff', marginBottom: 0 }}>
                            <option value="">Select a job site…</option>
                            {jobs.map(j => <option key={j.id} value={j.name}>{j.name}</option>)}
                        </select>
                    </div>
                )}

                {activeEntry && (
                    <div style={{ maxWidth: 260, margin: '0 auto 20px' }}>
                        <input className="input" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
                            style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }} />
                    </div>
                )}

                <button
                    className={activeEntry ? 'clock-btn-out' : 'clock-btn-in'}
                    onClick={activeEntry ? clockOut : clockIn}
                    disabled={saving}
                >
                    {activeEntry ? 'OUT' : 'IN'}
                </button>
                <div className="clock-action-label">{activeEntry ? 'Tap to clock out' : 'Tap to clock in'}</div>

                <div className="clock-today-earn">
                    <div className="clock-stat">
                        <div className="clock-stat-val">{fmtDuration(todayMs + (activeEntry ? elapsed : 0))}</div>
                        <div className="clock-stat-lbl">Today</div>
                    </div>
                    {user.rate > 0 && (
                        <div className="clock-stat">
                            <div className="clock-stat-val">${todayPay.toFixed(2)}</div>
                            <div className="clock-stat-lbl">Earnings</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent entries */}
            <div className="section-card" style={{ marginBottom: 12 }}>
                <div className="section-card-header">
                    <span className="section-card-title">Recent Entries</span>
                </div>
                {entries.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '0.85rem' }}>No time entries yet.</div>
                )}
                {entries.slice(0, 10).map(e => {
                    const dur = e.endTime ? e.endTime - e.startTime : (e.status === 'active' ? elapsed : 0);
                    return (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--color-border)', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text)' }}>{e.jobName || '—'}</div>
                                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-3)', marginTop: 2 }}>
                                    {fmtDate(e.startTime)} · {fmtTime(e.startTime)} – {e.endTime ? fmtTime(e.endTime) : '…'}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: e.status === 'active' ? 'var(--color-success)' : 'var(--color-text)' }}>
                                    {fmtDuration(dur)}
                                </div>
                                {e.status === 'active' && <span className="badge badge-active" style={{ fontSize: '0.66rem' }}>Active</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
