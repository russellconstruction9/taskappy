import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface Props {
    onLogin: (user: UserProfile) => void;
    onBack: () => void;
    onRegister: () => void;
}

export default function AdminLoginPage({ onLogin, onBack, onRegister }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
        setLoading(true);
        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError || !data.user) throw new Error('Invalid email or password.');

            const { data: profile } = await supabase
                .from('profiles')
                .select('id, name, rate, role, org_id')
                .eq('id', data.user.id)
                .single();

            if (!profile) throw new Error('Profile not found.');
            if (profile.role !== 'admin') {
                await supabase.auth.signOut();
                throw new Error('This account does not have manager access.');
            }

            onLogin({ id: profile.id, name: profile.name, rate: profile.rate ?? 0, role: 'admin', orgId: profile.org_id });
        } catch (err: any) {
            setError(err.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="layout-centered">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 12l2 2 4-4" /><rect x="3" y="3" width="18" height="18" rx="3" />
                        </svg>
                    </div>
                    <div className="auth-logo-name">Work<span>Flow</span></div>
                </div>

                <h1 className="auth-title">Manager Sign In</h1>
                <p className="auth-sub">Sign in to access your business dashboard</p>

                <form className="auth-form" onSubmit={handleLogin}>
                    {error && <div className="auth-error">{error}</div>}

                    <div className="input-group">
                        <label className="input-label">Email</label>
                        <input className="input" type="email" placeholder="you@yourbusiness.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <input className="input" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
                    </div>

                    <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-footer" style={{ marginTop: 24 }}>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                        <button className="auth-link" onClick={onBack}>← Employee Login</button>
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                        <button className="auth-link" onClick={onRegister}>Register Business</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
