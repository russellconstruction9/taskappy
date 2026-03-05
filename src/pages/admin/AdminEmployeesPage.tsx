import React, { useEffect, useState } from 'react';
import { getProfilesByOrg, getOrgById, updateProfile } from '../../lib/db';
import { createEmployee, deleteEmployee } from '../../lib/auth';
import { UserProfile } from '../../types';
import Modal from '../../components/Modal';
import AlertDialog from '../../components/AlertDialog';
import { useModal } from '../../hooks/useModal';

interface Props { user: UserProfile; }

interface Employee { id: string; name: string; rate: number; role: string; }

export default function AdminEmployeesPage({ user }: Props) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Add modal
    const addModal = useModal();
    const [addForm, setAddForm] = useState({ name: '', pin: '', rate: '' });

    // View/Edit modal
    const viewModal = useModal();
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', rate: '' });
    const [orgSlug, setOrgSlug] = useState('');

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

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
        if (!addForm.name.trim() || !addForm.pin.trim()) { setError('Name and PIN are required.'); return; }
        if (addForm.pin.length < 8) { setError('PIN must be at least 8 characters.'); return; }
        addModal.setSaving(true);

        try {
            const org = await getOrgById(user.orgId);
            if (!org) throw new Error('Could not find your organization.');

            await createEmployee({
                name: addForm.name.trim(),
                pin: addForm.pin,
                rate: parseFloat(addForm.rate) || 0,
                orgId: user.orgId,
                orgSlug: org.slug,
            });

            addModal.hide();
            setAddForm({ name: '', pin: '', rate: '' });
            fetchEmployees();
        } catch (err: any) {
            setError(err.message || 'Failed to create employee.');
        } finally {
            addModal.setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteEmployee(deleteTarget.id);
            fetchEmployees();
            viewModal.hide();
            setSelectedEmployee(null);
            setDeleteTarget(null);
        } catch (err: any) {
            setError(err.message || 'Failed to delete employee.');
            setDeleteTarget(null);
        }
    };

    const handleViewEmployee = (emp: Employee) => {
        setSelectedEmployee(emp);
        setEditForm({ name: emp.name, rate: emp.rate.toString() });
        setEditMode(false);
        setError('');
        viewModal.show();
    };

    const handleSaveEdit = async () => {
        if (!selectedEmployee) return;
        setError('');
        if (!editForm.name.trim()) { setError('Name is required.'); return; }
        viewModal.setSaving(true);
        try {
            await updateProfile(selectedEmployee.id, {
                name: editForm.name.trim(),
                rate: parseFloat(editForm.rate) || 0,
            });
            viewModal.hide();
            setSelectedEmployee(null);
            setEditMode(false);
            fetchEmployees();
        } catch (err: any) {
            setError(err.message || 'Failed to update employee.');
        } finally {
            viewModal.setSaving(false);
        }
    };

    const getSyntheticEmail = (name: string) => {
        const cleanName = name.trim().toLowerCase().replace(/\s+/g, '.');
        return `${cleanName}@${orgSlug}.taskpoint.local`;
    };

    return (
        <div>
            <div className="admin-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                    <h1>Employees</h1>
                    <p>{employees.filter(e => e.role === 'user').length} team members</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setError(''); setAddForm({ name: '', pin: '', rate: '' }); addModal.show(); }}>+ Add Employee</button>
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
                                        <div className="user-badge-avatar" style={{ background: emp.role === 'admin' ? 'var(--color-brand)' : '#0f172a', width: 32, height: 32, fontSize: '0.78rem' }}>
                                            {emp.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{emp.name}</span>
                                    </div>
                                </td>
                                <td><span className={`badge ${emp.role === 'admin' ? 'badge-high' : 'badge-pending'}`}>{emp.role === 'admin' ? 'Manager' : 'Employee'}</span></td>
                                <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{emp.rate > 0 ? `$${emp.rate}/hr` : '\u2014'}</td>
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
            <Modal
                open={viewModal.open && selectedEmployee !== null}
                onClose={() => viewModal.hide()}
                title={editMode ? 'Edit Employee' : 'Employee Details'}
                footer={editMode ? (
                    <>
                        <button className="btn btn-ghost" onClick={() => { setEditMode(false); if (selectedEmployee) setEditForm({ name: selectedEmployee.name, rate: selectedEmployee.rate.toString() }); }}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSaveEdit} disabled={viewModal.saving}>
                            {viewModal.saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </>
                ) : (
                    <>
                        {selectedEmployee && selectedEmployee.role !== 'admin' && (
                            <button className="btn btn-danger" onClick={() => setDeleteTarget(selectedEmployee)}>Remove Employee</button>
                        )}
                        <div style={{ flex: 1 }} />
                        <button className="btn btn-ghost" onClick={() => viewModal.hide()}>Close</button>
                        <button className="btn btn-primary" onClick={() => setEditMode(true)}>Edit</button>
                    </>
                )}
            >
                {error && <div className="error-banner">{error}</div>}

                {selectedEmployee && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                            <div className="user-badge-avatar" style={{ width: 56, height: 56, fontSize: '1.2rem', background: selectedEmployee.role === 'admin' ? 'var(--color-brand)' : '#0f172a' }}>
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

                        <div className="form-group">
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
                    </>
                )}
            </Modal>

            {/* Add Employee Modal */}
            <Modal
                open={addModal.open}
                onClose={addModal.hide}
                title="Add Employee"
                footer={
                    <>
                        <button className="btn btn-ghost" onClick={addModal.hide}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleAdd} disabled={addModal.saving}>
                            {addModal.saving ? 'Creating…' : 'Add Employee'}
                        </button>
                    </>
                }
            >
                {error && <div className="error-banner">{error}</div>}
                <div className="input-group">
                    <label className="input-label">Full Name *</label>
                    <input className="input" placeholder="e.g. Mike Johnson" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="input-group">
                    <label className="input-label">PIN (password) *</label>
                    <input className="input" type="password" placeholder="At least 8 characters" value={addForm.pin} onChange={e => setAddForm(f => ({ ...f, pin: e.target.value }))} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>Employee uses this PIN/password to log in (min 8 characters)</span>
                </div>
                <div className="input-group">
                    <label className="input-label">Hourly Rate ($)</label>
                    <input className="input" type="number" min="0" step="0.50" placeholder="e.g. 20.00" value={addForm.rate} onChange={e => setAddForm(f => ({ ...f, rate: e.target.value }))} />
                </div>
            </Modal>

            <AlertDialog
                open={deleteTarget !== null}
                title="Remove Employee"
                message={`Remove ${deleteTarget?.name} from your team? This cannot be undone.`}
                confirmLabel="Remove"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                destructive
            />
        </div>
    );
}
