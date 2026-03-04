import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface Props {
    onLogin: (user: UserProfile) => void;
    onAdminAccess: () => void;
    onRegister: () => void;
}

export default function LoginPage({ onLogin, onAdminAccess, onRegister }: Props) {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim() || !pin.trim() || !slug.trim()) {
            setError('Please fill in all fields.');
            return;
        }
        setLoading(true);
        try {
            // Build synthetic email: name@slug.taskpoint.local
            const cleanName = name.trim().toLowerCase().replace(/\s+/g, '.');
            const email = `${cleanName}@${slug.trim().toLowerCase()}.taskpoint.local`;
            const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password: pin });
            if (authError || !data.user) throw new Error('Invalid name, company code, or PIN.');

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, name, rate, role, org_id')
                .eq('id', data.user.id)
                .single();

            if (profileError || !profile) throw new Error('Profile not found. Contact your manager.');

            onLogin({
                id: profile.id,
                name: profile.name,
                rate: profile.rate ?? 0,
                role: profile.role,
                orgId: profile.org_id,
            });
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

                <h1 className="auth-title">Employee Sign In</h1>
                <p className="auth-sub">Enter your details provided by your manager</p>

                <form className="auth-form" onSubmit={handleLogin}>
                    {error && <div className="auth-error">{error}</div>}

                    <div className="input-group">
                        <label className="input-label">Company Code</label>
                        <input
                            className="input"
                            type="text"
                            placeholder="e.g. truchoice-roofing"
                            value={slug}
                            onChange={e => setSlug(e.target.value)}
                            autoComplete="organization"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Your Name</label>
                        <input
                            className="input"
                            type="text"
                            placeholder="e.g. Mike"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            autoComplete="name"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">PIN</label>
                        <input
                            className="input"
                            type="password"
                            placeholder="Enter your PIN"
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                            autoComplete="current-password"
                            inputMode="numeric"
                        />
                    </div>

                    <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-footer" style={{ marginTop: 24 }}>
                    <div className="auth-divider">Owner?</div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 16, justifyContent: 'center' }}>
                        <button className="auth-link" onClick={onAdminAccess}>Manager Login</button>
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                        <button className="auth-link" onClick={onRegister}>Register Business</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
