import React, { useEffect, useState } from 'react';
import { getJobsByOrg, createJob, updateJob, toggleJobActive, deleteJob } from '../../lib/db';
import { UserProfile, Job } from '../../types';
import Modal from '../../components/Modal';
import AlertDialog from '../../components/AlertDialog';
import { useModal } from '../../hooks/useModal';

interface Props { user: UserProfile; }

export default function AdminJobsPage({ user }: Props) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const modal = useModal();
    const [editing, setEditing] = useState<Job | null>(null);
    const [form, setForm] = useState({ name: '', address: '' });
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    useEffect(() => { fetchJobs(); }, [user.orgId]);

    const fetchJobs = async () => {
        if (!user.orgId) return;
        const data = await getJobsByOrg(user.orgId);
        setJobs(data);
        setLoading(false);
    };

    const openCreate = () => { setEditing(null); setForm({ name: '', address: '' }); modal.show(); };
    const openEdit = (job: Job) => { setEditing(job); setForm({ name: job.name, address: job.address }); modal.show(); };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        modal.setSaving(true);
        if (editing) {
            await updateJob(editing.id, { name: form.name.trim(), address: form.address.trim() });
        } else {
            await createJob({ name: form.name.trim(), address: form.address.trim(), orgId: user.orgId });
        }
        modal.hide();
        fetchJobs();
    };

    const toggleActive = async (job: Job) => {
        await toggleJobActive(job.id, !job.active);
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, active: !j.active } : j));
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        await deleteJob(deleteTarget);
        setJobs(prev => prev.filter(j => j.id !== deleteTarget));
        setDeleteTarget(null);
    };

    return (
        <div>
            <div className="admin-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                    <h1>Job Sites</h1>
                    <p>{jobs.filter(j => j.active).length} active locations</p>
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
                                <td style={{ color: 'var(--color-text-2)' }}>{job.address || '\u2014'}</td>
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
                                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(job.id)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal
                open={modal.open}
                onClose={modal.hide}
                title={editing ? 'Edit Job Site' : 'Add Job Site'}
                maxWidth="sm"
                footer={
                    <>
                        <button className="btn btn-ghost" onClick={modal.hide}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={modal.saving || !form.name.trim()}>
                            {modal.saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Job Site'}
                        </button>
                    </>
                }
            >
                <div className="input-group">
                    <label className="input-label">Site Name *</label>
                    <input className="input" placeholder="e.g. 123 Main St — Johnson Roof" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="input-group">
                    <label className="input-label">Address</label>
                    <input className="input" placeholder="123 Main St, City, ST" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
            </Modal>

            <AlertDialog
                open={deleteTarget !== null}
                title="Delete Job Site"
                message="Delete this job site? This cannot be undone."
                confirmLabel="Delete"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                destructive
            />
        </div>
    );
}
