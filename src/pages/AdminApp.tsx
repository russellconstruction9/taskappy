import React, { useState } from 'react';
import { UserProfile, AdminView } from '../types';
import { DashboardIcon, TasksIcon, EmployeesIcon, JobsIcon, TimeIcon, LogoutIcon } from '../components/icons';
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
    { view: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { view: 'tasks', label: 'Tasks', icon: <TasksIcon /> },
    { view: 'employees', label: 'Employees', icon: <EmployeesIcon /> },
    { view: 'jobs', label: 'Job Sites', icon: <JobsIcon /> },
    { view: 'time', label: 'Time', icon: <TimeIcon /> },
];

export default function AdminApp({ user, onLogout }: Props) {
    const [view, setView] = useState<AdminView>('dashboard');

    return (
        <div className="admin-shell">
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
                    <div className="user-badge">
                        <div className="user-badge-avatar">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div className="user-badge-name">{user.name}</div>
                            <div className="user-badge-role">Owner</div>
                        </div>
                    </div>
                    <button className="admin-nav-btn" onClick={onLogout} style={{ color: 'rgba(239,68,68,0.7)' }}>
                        <LogoutIcon />
                        Sign Out
                    </button>
                </div>
            </aside>

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
