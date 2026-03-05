import React, { useEffect, useState } from 'react';
import { getCurrentUser, signOut, reloadProfile } from './lib/auth';
import { UserProfile } from './types';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import RegisterPage from './pages/RegisterPage';
import EmployeeApp from './pages/EmployeeApp';
import AdminApp from './pages/AdminApp';

type Screen = 'login' | 'admin-login' | 'register';

export default function App() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [screen, setScreen] = useState<Screen>('login');
    const [loading, setLoading] = useState(true);

    // On mount — restore session from localStorage
    useEffect(() => {
        const restoreSession = async () => {
            const stored = getCurrentUser();
            if (stored) {
                // Refresh profile from DB to ensure it's still valid
                const refreshed = await reloadProfile(stored.id);
                if (refreshed) setUser(refreshed);
            }
            setLoading(false);
        };
        restoreSession();
    }, []);

    const handleLogin = (profile: UserProfile) => {
        setUser(profile);
        setScreen('login');
    };

    const handleLogout = () => {
        signOut();
        setUser(null);
        setScreen('login');
    };

    if (loading) {
        return (
            <div className="layout-centered">
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" style={{ borderTopColor: '#ea580c' }} />
                </div>
            </div>
        );
    }

    // ─── Not authenticated ────────────────────────────────────────────────────
    if (!user) {
        if (screen === 'register') {
            return (
                <RegisterPage
                    onBack={() => setScreen('login')}
                    onRegistered={handleLogin}
                />
            );
        }
        if (screen === 'admin-login') {
            return (
                <AdminLoginPage
                    onLogin={handleLogin}
                    onBack={() => setScreen('login')}
                    onRegister={() => setScreen('register')}
                />
            );
        }
        return (
            <LoginPage
                onLogin={handleLogin}
                onAdminAccess={() => setScreen('admin-login')}
                onRegister={() => setScreen('register')}
            />
        );
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    if (user.role === 'admin') {
        return <AdminApp user={user} onLogout={handleLogout} />;
    }

    // ─── Employee ─────────────────────────────────────────────────────────────
    return <EmployeeApp user={user} onLogout={handleLogout} />;
}
