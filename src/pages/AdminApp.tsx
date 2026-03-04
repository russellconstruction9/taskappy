import React, { useState } from 'react';
import { UserProfile, AdminView } from '../types';
import AdminDashboardPage from './admin/AdminDashboardPage';
import AdminTasksPage from './admin/AdminTasksPage';
import AdminEmployeesPage from './admin/AdminEmployeesPage';
import AdminJobsPage from './admin/AdminJobsPage';
import AdminTimePage from './admin/AdminTimePage';

interface Props {
    user: UserProfile;
    onLogout: () => void;
}

const Logo = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" /><rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
);

const navItems: { view: AdminView; label: string; icon: React.ReactNode }[] = [
    {
        view: 'dashboard', label: 'Dashboard', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
        )
    },
    {
        view: 'tasks', label: 'Tasks', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" />
            </svg>
        )
    },
    {
        view: 'employees', label: 'Employees', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        )
    },
    {
        view: 'jobs', label: 'Job Sites', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
        )
    },
    {
        view: 'time', label: 'Time', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" />
            </svg>
        )
    },
];

export default function AdminApp({ user, onLogout }: Props) {
    const [view, setView] = useState<AdminView>('dashboard');

    return (
        <div className="admin-shell">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-logo">
                    <div className="admin-sidebar-logomark"><Logo /></div>
                    <span className="admin-sidebar-brand">Work<span>Flow</span></span>
                </div>

                <nav className="admin-nav">
                    {navItems.map(item => (
                        <button
                            key={item.view}
                            className={`admin-nav-btn${view === item.view ? ' active' : ''}`}
                            onClick={() => setView(item.view)}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="admin-nav-footer">
                    <div style={{ padding: '8px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#fff', flexShrink: 0 }}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>Owner</div>
                        </div>
                    </div>
                    <button className="admin-nav-btn" onClick={onLogout} style={{ color: 'rgba(239,68,68,0.7)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="admin-main">
                {view === 'dashboard' && <AdminDashboardPage user={user} onNavigate={setView} />}
                {view === 'tasks' && <AdminTasksPage user={user} />}
                {view === 'employees' && <AdminEmployeesPage user={user} />}
                {view === 'jobs' && <AdminJobsPage user={user} />}
                {view === 'time' && <AdminTimePage user={user} />}
            </main>
        </div>
    );
}
