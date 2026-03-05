import React, { useEffect, useState } from 'react';
import { getProfilesByOrg, getOrgById, updateProfile } from '../../lib/db';
import { createEmployee, deleteEmployee } from '../../lib/auth';
import { UserProfile } from '../../types';

interface Props { user: UserProfile; }

interface Employee { id: string; name: string; rate: number; role: string; }

interface EmpForm { name: string; pin: string; rate: string; }

interface EditForm { name: string; rate: string; }

export default function AdminEmployeesPage({ user }: Props) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<EmpForm>({ name: '', pin: '', rate: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // View/Edit employee state
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState<EditForm>({ name: '', rate: '' });
    const [orgSlug, setOrgSlug] = useState('');

    useEffect(() => { fetchEmployees(); fetchOrgSlug(); }, [user.orgId]);

    const fetchOrgSlug = async () => {
        if (!user.orgId) return;
        const org = await getOrgById(user.orgId);
        if (org) setOrgSlug(org.slug);
    };

    const fetchEmployees = async () => {
        if (!user.orgId) return;
        const data = await getProfilesByOrg(user.orgId);
        setEmployees(data);
        setLoading(false);
    };

    const handleAdd = async () => {
        setError('');
        if (!form.name.trim() || !form.pin.trim()) { setError('Name and PIN are required.'); return; }
        if (form.pin.length < 8) { setError('PIN must be at least 8 characters.'); return; }
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
            setShowViewModal(false);
            setSelectedEmployee(null);
        } catch (err: any) {
            alert(err.message || 'Failed to delete employee.');
        }
    };

    const handleViewEmployee = (emp: Employee) => {
        setSelectedEmployee(emp);
        setEditForm({ name: emp.name, rate: emp.rate.toString() });
        setEditMode(false);
        setError('');
        setShowViewModal(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedEmployee) return;
        setError('');
        if (!editForm.name.trim()) { setError('Name is required.'); return; }
        setSaving(true);
        try {
            await updateProfile(selectedEmployee.id, {
                name: editForm.name.trim(),
                rate: parseFloat(editForm.rate) || 0,
            });
            setShowViewModal(false);
            setSelectedEmployee(null);
            setEditMode(false);
            fetchEmployees();
        } catch (err: any) {
            setError(err.message || 'Failed to update employee.');
        } finally {
            setSaving(false);
        }
    };

    const getSyntheticEmail = (name: string) => {
        const cleanName = name.trim().toLowerCase().replace(/\s+/g, '.');
        return `${cleanName}@${orgSlug}.taskpoint.local`;
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
                            <tr key={emp.id} onClick={() => handleViewEmployee(emp)} style={{ cursor: 'pointer' }}>
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
                                    {emp.role !== 'admin' ? getSyntheticEmail(emp.name) : 'uses real email'}
                                </td>
                                <td>
                                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleViewEmployee(emp); }}>View</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* View/Edit Employee Modal */}
            {showViewModal && selectedEmployee && (
                <div className="modal-backdrop" onClick={() => setShowViewModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editMode ? 'Edit Employee' : 'Employee Details'}</h2>
                            <button className="icon-btn" onClick={() => setShowViewModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {error && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', marginBottom: 16 }}>{error}</div>}

                            {/* Avatar and Name Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                                <div style={{ width: 56, height: 56, borderRadius: '50%', background: selectedEmployee.role === 'admin' ? 'var(--color-brand)' : '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem', color: '#fff', flexShrink: 0 }}>
                                    {(editMode ? editForm.name : selectedEmployee.name).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    {editMode ? (
                                        <input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={{ fontWeight: 600, fontSize: '1.1rem' }} />
                                    ) : (
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>{selectedEmployee.name}</div>
                                    )}
                                    <span className={`badge ${selectedEmployee.role === 'admin' ? 'badge-high' : 'badge-pending'}`} style={{ marginTop: 4 }}>
                                        {selectedEmployee.role === 'admin' ? 'Manager' : 'Employee'}
                                    </span>
                                </div>
                            </div>

                            {/* Details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="input-group">
                                    <label className="input-label">Hourly Rate</label>
                                    {editMode ? (
                                        <input className="input" type="number" min="0" step="0.50" value={editForm.rate} onChange={e => setEditForm(f => ({ ...f, rate: e.target.value }))} />
                                    ) : (
                                        <div style={{ padding: '10px 0', fontWeight: 600, fontSize: '1rem' }}>
                                            {selectedEmployee.rate > 0 ? `$${selectedEmployee.rate}/hr` : 'Not set'}
                                        </div>
                                    )}
                                </div>

                                {selectedEmployee.role !== 'admin' && (
                                    <div className="input-group">
                                        <label className="input-label">Login Information</label>
                                        <div style={{ background: 'var(--color-surface-2)', borderRadius: 8, padding: 16 }}>
                                            <div style={{ marginBottom: 12 }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginBottom: 4 }}>Company Code</div>
                                                <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{orgSlug}</div>
                                            </div>
                                            <div style={{ marginBottom: 12 }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginBottom: 4 }}>Name (for login)</div>
                                                <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{editMode ? editForm.name : selectedEmployee.name}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginBottom: 4 }}>Internal Email</div>
                                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-text-2)' }}>
                                                    {getSyntheticEmail(editMode ? editForm.name : selectedEmployee.name)}
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: 8, display: 'block' }}>
                                            Employee logs in with their name, company code, and PIN
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            {editMode ? (
                                <>
                                    <button className="btn btn-ghost" onClick={() => { setEditMode(false); setEditForm({ name: selectedEmployee.name, rate: selectedEmployee.rate.toString() }); }}>Cancel</button>
                                    <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                                        {saving ? 'Saving…' : 'Save Changes'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    {selectedEmployee.role !== 'admin' && (
                                        <button className="btn btn-danger" onClick={() => handleDelete(selectedEmployee)}>Remove Employee</button>
                                    )}
                                    <div style={{ flex: 1 }} />
                                    <button className="btn btn-ghost" onClick={() => setShowViewModal(false)}>Close</button>
                                    <button className="btn btn-primary" onClick={() => setEditMode(true)}>Edit</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                                <input className="input" type="password" placeholder="At least 8 characters" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>Employee uses this PIN/password to log in (min 8 characters)</span>
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
