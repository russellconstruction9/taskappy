import React, { useState } from 'react';
import { UserProfile, EmployeeView } from '../types';
import EmployeeTasksPage from './employee/EmployeeTasksPage';
import EmployeeTimeClockPage from './employee/EmployeeTimeClockPage';
import EmployeeSchedulePage from './employee/EmployeeSchedulePage';

interface Props {
    user: UserProfile;
    onLogout: () => void;
}

const Logo = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" /><rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
);

const TaskIcon = ({ active }: { active: boolean }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" />
    </svg>
);
const ClockIcon = ({ active }: { active: boolean }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" />
    </svg>
);
const CalIcon = ({ active }: { active: boolean }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);
const LogoutIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const navItems: { view: EmployeeView; label: string; Icon: React.FC<{ active: boolean }> }[] = [
    { view: 'tasks', label: 'Tasks', Icon: TaskIcon },
    { view: 'timeclock', label: 'Time', Icon: ClockIcon },
    { view: 'schedule', label: 'Schedule', Icon: CalIcon },
];

export default function EmployeeApp({ user, onLogout }: Props) {
    const [view, setView] = useState<EmployeeView>('tasks');

    return (
        <div className="emp-shell">
            {/* Header */}
            <header className="emp-header">
                <div className="emp-header-logo">
                    <div className="emp-header-logomark"><Logo /></div>
                    <span className="emp-header-name">Work<span>Flow</span></span>
                </div>
                <div className="emp-header-right">
                    <div className="emp-avatar">{user.name.charAt(0).toUpperCase()}</div>
                    <button className="icon-btn" onClick={onLogout} title="Log out" style={{ color: 'var(--color-text-3)' }}>
                        <LogoutIcon />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="emp-main">
                {view === 'tasks' && <EmployeeTasksPage user={user} />}
                {view === 'timeclock' && <EmployeeTimeClockPage user={user} />}
                {view === 'schedule' && <EmployeeSchedulePage user={user} />}
            </main>

            {/* Bottom Nav */}
            <nav className="emp-bottom-nav">
                {navItems.map(({ view: v, label, Icon }) => (
                    <button
                        key={v}
                        className={`emp-nav-btn${view === v ? ' active' : ''}`}
                        onClick={() => setView(v)}
                    >
                        <Icon active={view === v} />
                        <span className="emp-nav-label">{label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
