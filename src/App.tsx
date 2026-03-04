import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
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

    // On mount — restore session from Supabase
    useEffect(() => {
        const restoreSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) await loadProfile(session.user.id);
            setLoading(false);
        };

        restoreSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') { setUser(null); return; }
            if (session && !user) await loadProfile(session.user.id);
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadProfile = async (userId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('id, name, rate, role, org_id')
            .eq('id', userId)
            .single();

        if (data) {
            setUser({
                id: data.id,
                name: data.name,
                rate: data.rate ?? 0,
                role: data.role,
                orgId: data.org_id,
            });
        }
    };

    const handleLogin = (profile: UserProfile) => {
        setUser(profile);
        setScreen('login');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
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
