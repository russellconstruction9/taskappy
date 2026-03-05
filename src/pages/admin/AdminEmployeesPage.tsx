import React, { useEffect, useState } from 'react';
import { getProfilesByOrg, getOrgById } from '../../lib/db';
import { createEmployee, deleteEmployee } from '../../lib/auth';
import { UserProfile } from '../../types';

interface Props { user: UserProfile; }

interface Employee { id: string; name: string; rate: number; role: string; }

interface EmpForm { name: string; pin: string; rate: string; }

export default function AdminEmployeesPage({ user }: Props) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<EmpForm>({ name: '', pin: '', rate: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { fetchEmployees(); }, [user.orgId]);

    const fetchEmployees = async () => {
        if (!user.orgId) return;
        const data = await getProfilesByOrg(user.orgId);
        setEmployees(data);
        setLoading(false);
    };

    const handleAdd = async () => {
        setError('');
        if (!form.name.trim() || !form.pin.trim()) { setError('Name and PIN are required.'); return; }
        if (form.pin.length < 4) { setError('PIN must be at least 4 characters.'); return; }
        setSaving(true);

        try {
            // Get org slug
            const org = await getOrgById(user.orgId);
            if (!org) throw new Error('Could not find your organization.');

            await createEmployee({
                name: form.name.trim(),
                pin: form.pin,
                rate: parseFloat(form.rate) || 0,
                orgId: user.orgId,
                orgSlug: org.slug,
            });

            setShowModal(false);
            setForm({ name: '', pin: '', rate: '' });
            fetchEmployees();
        } catch (err: any) {
            setError(err.message || 'Failed to create employee.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (emp: Employee) => {
        if (!confirm(`Remove ${emp.name} from your team? This cannot be undone.`)) return;
        try {
            await deleteEmployee(emp.id);
            fetchEmployees();
        } catch (err: any) {
            alert(err.message || 'Failed to delete employee.');
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Employees</h1>
                    <p style={{ margin: 0, color: 'var(--color-text-2)', fontSize: '0.88rem' }}>{employees.filter(e => e.role === 'user').length} team members</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setError(''); setForm({ name: '', pin: '', rate: '' }); setShowModal(true); }}>+ Add Employee</button>
            </div>

            {loading && <div className="loading-wrap"><div className="loading-spinner" /></div>}

            <div className="section-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Hourly Rate</th>
                            <th>Login Email</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.length === 0 && !loading && (
                            <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-3)', padding: '32px' }}>No employees yet. Add your first team member.</td></tr>
                        )}
                        {employees.map(emp => (
                            <tr key={emp.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: emp.role === 'admin' ? 'var(--color-brand)' : '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.78rem', color: '#fff', flexShrink: 0 }}>
                                            {emp.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{emp.name}</span>
                                    </div>
                                </td>
                                <td><span className={`badge ${emp.role === 'admin' ? 'badge-high' : 'badge-pending'}`}>{emp.role === 'admin' ? 'Manager' : 'Employee'}</span></td>
                                <td style={{ fontWeight: 600 }}>{emp.rate > 0 ? `$${emp.rate}/hr` : '—'}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-3)' }}>
                                    {emp.role !== 'admin' ? `${emp.name.toLowerCase().replace(/\s+/g, '.')}@org.taskpoint.local` : 'real email'}
                                </td>
                                <td>
                                    {emp.role !== 'admin' && (
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp)}>Remove</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Employee Modal */}
            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add Employee</h2>
                            <button className="icon-btn" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {error && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem' }}>{error}</div>}
                            <div className="input-group">
                                <label className="input-label">Full Name *</label>
                                <input className="input" placeholder="e.g. Mike Johnson" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">PIN (password) *</label>
                                <input className="input" type="password" placeholder="At least 4 digits" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} inputMode="numeric" />
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>Employee uses this PIN to log in</span>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Hourly Rate ($)</label>
                                <input className="input" type="number" min="0" step="0.50" placeholder="e.g. 20.00" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
                                {saving ? 'Creating…' : 'Add Employee'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
