import { authClient } from './auth-client';
import { sql } from './neon';
import { UserProfile } from '../types';

const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL as string;

// ─── Profile Cache ─────────────────────────────────────────────────────────

const PROFILE_KEY = 'wf_profile';

function cacheProfile(profile: UserProfile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function getCachedProfile(): UserProfile | null {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function clearCachedProfile() {
    localStorage.removeItem(PROFILE_KEY);
}

// ─── Helper: Load profile from DB ──────────────────────────────────────────

async function loadProfile(userId: string): Promise<UserProfile | null> {
    const rows = await sql`
        SELECT p.user_id, p.name, p.rate, p.role, p.org_id, u.email
        FROM public.profiles p
        JOIN neon_auth."user" u ON u.id = p.user_id
        WHERE p.user_id = ${userId}
    `;
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
        id: r.user_id,
        name: r.name,
        rate: Number(r.rate) || 0,
        role: r.role as 'admin' | 'user',
        orgId: r.org_id,
        email: r.email,
    };
}

// ─── Auth Functions ────────────────────────────────────────────────────────

/** Register a new admin + organization */
export async function signUpAdmin(opts: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    slug: string;
}): Promise<UserProfile> {
    const { name, email, password, companyName, slug } = opts;

    // 1. Sign up via Better Auth (server-side scrypt hashing + session)
    const { data, error } = await authClient.signUp.email({
        email,
        password,
        name,
    });
    if (error || !data?.user) throw new Error(error?.message || 'Registration failed.');

    const userId = data.user.id;

    // 2. Create organization
    const orgRows = await sql`
        INSERT INTO public.organizations (name, slug)
        VALUES (${companyName}, ${slug})
        RETURNING id
    `;
    const orgId = orgRows[0].id;

    // 3. Create profile
    await sql`
        INSERT INTO public.profiles (user_id, name, rate, role, org_id)
        VALUES (${userId}, ${name}, 0, 'admin', ${orgId})
    `;

    const profile: UserProfile = { id: userId, name, rate: 0, role: 'admin', orgId, email };
    cacheProfile(profile);
    return profile;
}

/** Admin sign in with email + password */
export async function signInAdmin(email: string, password: string): Promise<UserProfile> {
    const { data, error } = await authClient.signIn.email({
        email,
        password,
    });
    if (error || !data?.user) throw new Error(error?.message || 'Invalid email or password.');

    const userId = data.user.id;
    const profile = await loadProfile(userId);
    if (!profile) throw new Error('Profile not found.');
    if (profile.role !== 'admin') throw new Error('This account does not have manager access.');

    cacheProfile(profile);
    return profile;
}

/** Employee sign in with name + company slug + PIN */
export async function signInEmployee(name: string, slug: string, pin: string): Promise<UserProfile> {
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '.');
    const syntheticEmail = `${cleanName}@${slug.trim().toLowerCase()}.taskpoint.local`;

    const { data, error } = await authClient.signIn.email({
        email: syntheticEmail,
        password: pin,
    });
    if (error || !data?.user) throw new Error('Invalid name, company code, or PIN.');

    const userId = data.user.id;
    const profile = await loadProfile(userId);
    if (!profile) throw new Error('Profile not found. Contact your manager.');

    cacheProfile(profile);
    return profile;
}

/** Create an employee user (called by admin) */
export async function createEmployee(opts: {
    name: string;
    pin: string;
    rate: number;
    orgId: string;
    orgSlug: string;
}): Promise<void> {
    const { name, pin, rate, orgId, orgSlug } = opts;
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '.');
    const syntheticEmail = `${cleanName}@${orgSlug}.taskpoint.local`;

    // Create auth user via Better Auth sign-up endpoint (raw fetch, no cookies)
    // This avoids disrupting the admin's active session
    const res = await fetch(`${NEON_AUTH_URL}/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: syntheticEmail,
            password: pin,
            name,
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to create employee' }));
        throw new Error(err.message || 'Failed to create employee');
    }

    const data = await res.json();
    const userId = data.user?.id;
    if (!userId) throw new Error('Failed to create employee user');

    // Create profile
    await sql`
        INSERT INTO public.profiles (user_id, name, rate, role, org_id)
        VALUES (${userId}, ${name}, ${rate}, 'user', ${orgId})
    `;
}

/** Delete an employee user (called by admin) */
export async function deleteEmployee(userId: string): Promise<void> {
    await sql`DELETE FROM public.profiles WHERE user_id = ${userId}`;
    await sql`DELETE FROM neon_auth."session" WHERE "userId" = ${userId}`;
    await sql`DELETE FROM neon_auth."account" WHERE "userId" = ${userId}`;
    await sql`DELETE FROM neon_auth."user" WHERE id = ${userId}`;
}

/** Sign out via Better Auth */
export async function signOut(): Promise<void> {
    try {
        await authClient.signOut();
    } catch {
        // Ignore — clear local state anyway
    }
    clearCachedProfile();
}

/** Restore session from Better Auth + load profile */
export async function getSession(): Promise<UserProfile | null> {
    try {
        const { data } = await authClient.getSession();
        if (!data?.user?.id) {
            clearCachedProfile();
            return null;
        }

        // Use cached profile if user ID matches
        const cached = getCachedProfile();
        if (cached && cached.id === data.user.id) return cached;

        // Otherwise load from DB
        const profile = await loadProfile(data.user.id);
        if (profile) cacheProfile(profile);
        return profile;
    } catch {
        clearCachedProfile();
        return null;
    }
}

/** Get cached profile (synchronous, for fast initial render) */
export function getCurrentUser(): UserProfile | null {
    return getCachedProfile();
}

/** Reload profile from DB */
export async function reloadProfile(userId: string): Promise<UserProfile | null> {
    const profile = await loadProfile(userId);
    if (profile) cacheProfile(profile);
    return profile;
}
