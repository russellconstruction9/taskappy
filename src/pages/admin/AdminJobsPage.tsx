import React, { useEffect, useState } from 'react';
import { getJobsByOrg, createJob, updateJob, toggleJobActive, deleteJob } from '../../lib/db';
import { UserProfile, Job } from '../../types';

interface Props { user: UserProfile; }

export default function AdminJobsPage({ user }: Props) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Job | null>(null);
    const [form, setForm] = useState({ name: '', address: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchJobs(); }, [user.orgId]);

    const fetchJobs = async () => {
        if (!user.orgId) return;
        const data = await getJobsByOrg(user.orgId);
        setJobs(data);
        setLoading(false);
    };

    const openCreate = () => { setEditing(null); setForm({ name: '', address: '' }); setShowModal(true); };
    const openEdit = (job: Job) => { setEditing(job); setForm({ name: job.name, address: job.address }); setShowModal(true); };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        if (editing) {
            await updateJob(editing.id, { name: form.name.trim(), address: form.address.trim() });
        } else {
            await createJob({ name: form.name.trim(), address: form.address.trim(), orgId: user.orgId });
        }
        setShowModal(false);
        fetchJobs();
        setSaving(false);
    };

    const toggleActive = async (job: Job) => {
        await toggleJobActive(job.id, !job.active);
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, active: !j.active } : j));
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this job site?')) return;
        await deleteJob(id);
        setJobs(prev => prev.filter(j => j.id !== id));
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Job Sites</h1>
                    <p style={{ margin: 0, color: 'var(--color-text-2)', fontSize: '0.88rem' }}>{jobs.filter(j => j.active).length} active locations</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>+ Add Job Site</button>
            </div>

            {loading && <div className="loading-wrap"><div className="loading-spinner" /></div>}

            <div className="section-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Job Site</th>
                            <th>Address</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.length === 0 && !loading && (
                            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-3)', padding: '32px' }}>No job sites yet.</td></tr>
                        )}
                        {jobs.map(job => (
                            <tr key={job.id}>
                                <td>
                                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{job.name}</div>
                                </td>
                                <td style={{ color: 'var(--color-text-2)' }}>{job.address || '—'}</td>
                                <td>
                                    <button
                                        className={`badge ${job.active ? 'badge-active' : 'badge-pending'}`}
                                        onClick={() => toggleActive(job)}
                                        style={{ cursor: 'pointer', border: 'none' }}
                                        title="Toggle active"
                                    >
                                        {job.active ? 'Active' : 'Archived'}
                                    </button>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(job)}>Edit</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(job.id)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editing ? 'Edit Job Site' : 'Add Job Site'}</h2>
                            <button className="icon-btn" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group">
                                <label className="input-label">Site Name *</label>
                                <input className="input" placeholder="e.g. 123 Main St — Johnson Roof" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Address</label>
                                <input className="input" placeholder="123 Main St, City, ST" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
                                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Job Site'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
