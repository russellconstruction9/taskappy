import { sql } from './neon';
import { UserProfile } from '../types';

// ─── Password Hashing (PBKDF2 via Web Crypto API) ─────────────────────────

async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        key,
        256
    );
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const [saltHex, hashHex] = stored.split(':');
    if (!saltHex || !hashHex) return false;
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        key,
        256
    );
    const computed = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return computed === hashHex;
}

// ─── Session Management ────────────────────────────────────────────────────

const SESSION_KEY = 'wf_session';

function storeSession(profile: UserProfile) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

function getStoredSession(): UserProfile | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
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

    // 1. Create auth user in neon_auth
    const hashedPwd = await hashPassword(password);
    const userRows = await sql`
        INSERT INTO neon_auth."user" (name, email, "emailVerified", role, "createdAt", "updatedAt")
        VALUES (${name}, ${email}, false, 'user', now(), now())
        RETURNING id
    `;
    const userId = userRows[0].id;

    // 2. Create credential account
    await sql`
        INSERT INTO neon_auth."account" ("accountId", "providerId", "userId", password, "createdAt", "updatedAt")
        VALUES (${userId}, 'credential', ${userId}, ${hashedPwd}, now(), now())
    `;

    // 3. Create organization
    const orgRows = await sql`
        INSERT INTO public.organizations (name, slug)
        VALUES (${companyName}, ${slug})
        RETURNING id
    `;
    const orgId = orgRows[0].id;

    // 4. Create profile
    await sql`
        INSERT INTO public.profiles (user_id, name, rate, role, org_id)
        VALUES (${userId}, ${name}, 0, 'admin', ${orgId})
    `;

    const profile: UserProfile = { id: userId, name, rate: 0, role: 'admin', orgId };
    storeSession(profile);
    return profile;
}

/** Admin sign in with email + password */
export async function signInAdmin(email: string, password: string): Promise<UserProfile> {
    // Find user by email
    const users = await sql`
        SELECT u.id, u.name, u.email
        FROM neon_auth."user" u
        WHERE u.email = ${email}
    `;
    if (users.length === 0) throw new Error('Invalid email or password.');

    const user = users[0];

    // Get credential account
    const accounts = await sql`
        SELECT password FROM neon_auth."account"
        WHERE "userId" = ${user.id} AND "providerId" = 'credential'
    `;
    if (accounts.length === 0 || !accounts[0].password) throw new Error('Invalid email or password.');

    const valid = await verifyPassword(password, accounts[0].password);
    if (!valid) throw new Error('Invalid email or password.');

    // Get profile
    const profiles = await sql`
        SELECT user_id, name, rate, role, org_id
        FROM public.profiles
        WHERE user_id = ${user.id}
    `;
    if (profiles.length === 0) throw new Error('Profile not found.');
    const p = profiles[0];
    if (p.role !== 'admin') throw new Error('This account does not have manager access.');

    const profile: UserProfile = {
        id: p.user_id,
        name: p.name,
        rate: Number(p.rate) || 0,
        role: 'admin',
        orgId: p.org_id,
    };
    storeSession(profile);
    return profile;
}

/** Employee sign in with name + company slug + PIN */
export async function signInEmployee(name: string, slug: string, pin: string): Promise<UserProfile> {
    // Build synthetic email
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '.');
    const email = `${cleanName}@${slug.trim().toLowerCase()}.taskpoint.local`;

    // Find user by email
    const users = await sql`
        SELECT u.id, u.name
        FROM neon_auth."user" u
        WHERE u.email = ${email}
    `;
    if (users.length === 0) throw new Error('Invalid name, company code, or PIN.');

    const user = users[0];

    // Get credential account
    const accounts = await sql`
        SELECT password FROM neon_auth."account"
        WHERE "userId" = ${user.id} AND "providerId" = 'credential'
    `;
    if (accounts.length === 0 || !accounts[0].password) throw new Error('Invalid name, company code, or PIN.');

    const valid = await verifyPassword(pin, accounts[0].password);
    if (!valid) throw new Error('Invalid name, company code, or PIN.');

    // Get profile
    const profiles = await sql`
        SELECT user_id, name, rate, role, org_id
        FROM public.profiles
        WHERE user_id = ${user.id}
    `;
    if (profiles.length === 0) throw new Error('Profile not found. Contact your manager.');
    const p = profiles[0];

    const profile: UserProfile = {
        id: p.user_id,
        name: p.name,
        rate: Number(p.rate) || 0,
        role: p.role as 'admin' | 'user',
        orgId: p.org_id,
    };
    storeSession(profile);
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
    const email = `${cleanName}@${orgSlug}.taskpoint.local`;
    const hashedPwd = await hashPassword(pin);

    // Create auth user
    const userRows = await sql`
        INSERT INTO neon_auth."user" (name, email, "emailVerified", role, "createdAt", "updatedAt")
        VALUES (${name}, ${email}, false, 'user', now(), now())
        RETURNING id
    `;
    const userId = userRows[0].id;

    // Create credential account
    await sql`
        INSERT INTO neon_auth."account" ("accountId", "providerId", "userId", password, "createdAt", "updatedAt")
        VALUES (${userId}, 'credential', ${userId}, ${hashedPwd}, now(), now())
    `;

    // Create profile
    await sql`
        INSERT INTO public.profiles (user_id, name, rate, role, org_id)
        VALUES (${userId}, ${name}, ${rate}, 'user', ${orgId})
    `;
}

/** Delete an employee user (called by admin) */
export async function deleteEmployee(userId: string): Promise<void> {
    // Delete profile first (FK constraint)
    await sql`DELETE FROM public.profiles WHERE user_id = ${userId}`;
    // Delete account
    await sql`DELETE FROM neon_auth."account" WHERE "userId" = ${userId}`;
    // Delete user
    await sql`DELETE FROM neon_auth."user" WHERE id = ${userId}`;
}

/** Sign out */
export function signOut(): void {
    clearSession();
}

/** Get current user from stored session */
export function getCurrentUser(): UserProfile | null {
    return getStoredSession();
}

/** Reload profile from DB (e.g. after session restore) */
export async function reloadProfile(userId: string): Promise<UserProfile | null> {
    const profiles = await sql`
        SELECT user_id, name, rate, role, org_id
        FROM public.profiles
        WHERE user_id = ${userId}
    `;
    if (profiles.length === 0) return null;
    const p = profiles[0];
    const profile: UserProfile = {
        id: p.user_id,
        name: p.name,
        rate: Number(p.rate) || 0,
        role: p.role as 'admin' | 'user',
        orgId: p.org_id,
    };
    storeSession(profile);
    return profile;
}
