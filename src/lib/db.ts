import { sql } from './neon';
import { Task, Job, TimeEntry } from '../types';

// ─── Organizations ─────────────────────────────────────────────────────────

export async function getOrgBySlug(slug: string) {
    const rows = await sql`SELECT id, name, slug FROM public.organizations WHERE slug = ${slug}`;
    return rows[0] ?? null;
}

export async function getOrgById(orgId: string) {
    const rows = await sql`SELECT id, name, slug FROM public.organizations WHERE id = ${orgId}`;
    return rows[0] ?? null;
}

// ─── Profiles ──────────────────────────────────────────────────────────────

export async function getProfilesByOrg(orgId: string) {
    const rows = await sql`
        SELECT p.user_id as id, p.name, p.rate, p.role
        FROM public.profiles p
        WHERE p.org_id = ${orgId}
        ORDER BY p.name
    `;
    return rows.map(r => ({
        id: r.id,
        name: r.name,
        rate: Number(r.rate) || 0,
        role: r.role,
    }));
}

export async function getEmployeesByOrg(orgId: string): Promise<{ id: string; name: string }[]> {
    const rows = await sql`
        SELECT p.user_id as id, p.name
        FROM public.profiles p
        WHERE p.org_id = ${orgId} AND p.role = 'user'
        ORDER BY p.name
    `;
    return rows as unknown as { id: string; name: string }[];
}

// ─── Jobs ──────────────────────────────────────────────────────────────────

export async function getJobsByOrg(orgId: string): Promise<Job[]> {
    const rows = await sql`
        SELECT id, name, address, active
        FROM public.jobs
        WHERE org_id = ${orgId}
        ORDER BY name
    `;
    return rows.map(r => ({ id: r.id, name: r.name, address: r.address ?? '', active: r.active }));
}

export async function getActiveJobsByOrg(orgId: string): Promise<Job[]> {
    const rows = await sql`
        SELECT id, name, address, active
        FROM public.jobs
        WHERE org_id = ${orgId} AND active = true
        ORDER BY name
    `;
    return rows.map(r => ({ id: r.id, name: r.name, address: r.address ?? '', active: r.active }));
}

export async function createJob(job: { name: string; address: string; orgId: string }) {
    await sql`
        INSERT INTO public.jobs (name, address, org_id, active)
        VALUES (${job.name}, ${job.address}, ${job.orgId}, true)
    `;
}

export async function updateJob(id: string, data: { name: string; address: string }) {
    await sql`
        UPDATE public.jobs SET name = ${data.name}, address = ${data.address}
        WHERE id = ${id}
    `;
}

export async function toggleJobActive(id: string, active: boolean) {
    await sql`UPDATE public.jobs SET active = ${active} WHERE id = ${id}`;
}

export async function deleteJob(id: string) {
    await sql`DELETE FROM public.jobs WHERE id = ${id}`;
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

function mapTask(r: any): Task {
    return {
        id: r.id,
        title: r.title,
        description: r.description ?? '',
        location: r.location ?? '',
        assignedTo: r.assigned_to ?? '',
        dueDate: r.due_date ?? '',
        priority: r.priority ?? 'Medium',
        status: r.status ?? 'Pending',
        createdAt: Number(r.created_at) || 0,
        jobName: r.job_name,
        orgId: r.org_id,
    };
}

export async function getTasksByOrg(orgId: string): Promise<Task[]> {
    const rows = await sql`
        SELECT * FROM public.tasks
        WHERE org_id = ${orgId}
        ORDER BY created_at DESC
    `;
    return rows.map(mapTask);
}

export async function getTasksByEmployee(orgId: string, employeeName: string): Promise<Task[]> {
    const rows = await sql`
        SELECT * FROM public.tasks
        WHERE org_id = ${orgId} AND assigned_to = ${employeeName}
        ORDER BY created_at DESC
    `;
    return rows.map(mapTask);
}

export async function createTask(task: {
    title: string; description: string; location: string;
    assignedTo: string; dueDate: string | null; priority: string;
    status: string; jobName: string | null; orgId: string;
}) {
    await sql`
        INSERT INTO public.tasks (title, description, location, assigned_to, due_date, priority, status, job_name, org_id, created_at)
        VALUES (${task.title}, ${task.description}, ${task.location}, ${task.assignedTo},
                ${task.dueDate}, ${task.priority}, ${task.status}, ${task.jobName}, ${task.orgId},
                ${Date.now()})
    `;
}

export async function updateTask(id: string, data: {
    title: string; description: string; location: string;
    assignedTo: string; dueDate: string | null; priority: string;
    status: string; jobName: string | null; orgId: string;
}) {
    await sql`
        UPDATE public.tasks
        SET title = ${data.title}, description = ${data.description}, location = ${data.location},
            assigned_to = ${data.assignedTo}, due_date = ${data.dueDate}, priority = ${data.priority},
            status = ${data.status}, job_name = ${data.jobName}, org_id = ${data.orgId}
        WHERE id = ${id}
    `;
}

export async function updateTaskStatus(id: string, status: string) {
    await sql`UPDATE public.tasks SET status = ${status} WHERE id = ${id}`;
}

export async function deleteTask(id: string) {
    await sql`DELETE FROM public.tasks WHERE id = ${id}`;
}

// ─── Time Entries ──────────────────────────────────────────────────────────

function mapTimeEntry(r: any): TimeEntry {
    return {
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        startTime: Number(r.start_time),
        endTime: r.end_time ? Number(r.end_time) : null,
        status: r.status,
        jobName: r.job_name,
        notes: r.notes,
        totalPay: r.total_pay ? Number(r.total_pay) : undefined,
        orgId: r.org_id,
    };
}

export async function getTimeEntriesByOrg(orgId: string, limit = 200): Promise<TimeEntry[]> {
    const rows = await sql`
        SELECT * FROM public.time_entries
        WHERE org_id = ${orgId}
        ORDER BY start_time DESC
        LIMIT ${limit}
    `;
    return rows.map(mapTimeEntry);
}

export async function getActiveTimeEntriesByOrg(orgId: string): Promise<TimeEntry[]> {
    const rows = await sql`
        SELECT * FROM public.time_entries
        WHERE org_id = ${orgId} AND status = 'active'
    `;
    return rows.map(mapTimeEntry);
}

export async function getTimeEntriesByUser(userId: string, limit = 30): Promise<TimeEntry[]> {
    const rows = await sql`
        SELECT * FROM public.time_entries
        WHERE user_id = ${userId}
        ORDER BY start_time DESC
        LIMIT ${limit}
    `;
    return rows.map(mapTimeEntry);
}

export async function clockIn(entry: {
    userId: string; userName: string; jobName: string; orgId: string;
}): Promise<TimeEntry> {
    const startTime = Date.now();
    const rows = await sql`
        INSERT INTO public.time_entries (user_id, user_name, start_time, status, job_name, org_id)
        VALUES (${entry.userId}, ${entry.userName}, ${startTime}, 'active', ${entry.jobName}, ${entry.orgId})
        RETURNING *
    `;
    return mapTimeEntry(rows[0]);
}

export async function clockOut(id: string, opts: { notes?: string; totalPay?: number }) {
    const endTime = Date.now();
    await sql`
        UPDATE public.time_entries
        SET end_time = ${endTime}, status = 'completed',
            total_pay = ${opts.totalPay ?? null}, notes = ${opts.notes ?? null}
        WHERE id = ${id}
    `;
}
