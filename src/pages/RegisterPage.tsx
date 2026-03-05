import React, { useState } from 'react';
import { signUpAdmin } from '../lib/auth';
import { UserProfile } from '../types';

interface Props {
    onBack: () => void;
    onRegistered: (user: UserProfile) => void;
}

function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function RegisterPage({ onBack, onRegistered }: Props) {
    const [companyName, setCompanyName] = useState('');
    const [adminName, setAdminName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const slug = slugify(companyName);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!companyName.trim() || !adminName.trim() || !email.trim() || !password.trim()) {
            setError('Please fill in all fields.');
            return;
        }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        if (!slug) { setError('Invalid company name.'); return; }
        setLoading(true);

        try {
            const profile = await signUpAdmin({
                name: adminName.trim(),
                email: email.trim(),
                password,
                companyName: companyName.trim(),
                slug,
            });
            onRegistered(profile);
        } catch (err: any) {
            setError(err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="layout-centered">
            <div className="auth-card" style={{ maxWidth: 460 }}>
                <div className="auth-logo">
                    <div className="auth-logo-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 12l2 2 4-4" /><rect x="3" y="3" width="18" height="18" rx="3" />
                        </svg>
                    </div>
                    <div className="auth-logo-name">Work<span>Flow</span></div>
                </div>

                <h1 className="auth-title">Register Your Business</h1>
                <p className="auth-sub">Get your team up and running in seconds</p>

                <form className="auth-form" onSubmit={handleRegister}>
                    {error && <div className="auth-error">{error}</div>}

                    <div className="input-group">
                        <label className="input-label">Company Name</label>
                        <input className="input" type="text" placeholder="e.g. TruChoice Roofing" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                        {slug && (
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                                Company code: <strong style={{ color: 'rgba(255,255,255,0.55)' }}>{slug}</strong>
                            </span>
                        )}
                    </div>

                    <div className="input-group">
                        <label className="input-label">Your Name</label>
                        <input className="input" type="text" placeholder="Your full name" value={adminName} onChange={e => setAdminName(e.target.value)} />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Email</label>
                        <input className="input" type="email" placeholder="you@yourbusiness.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password (min 8 chars)</label>
                        <input className="input" type="password" placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
                    </div>

                    <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer" style={{ marginTop: 20 }}>
                    <button className="auth-link" onClick={onBack}>← Back to login</button>
                </div>
            </div>
        </div>
    );
}
