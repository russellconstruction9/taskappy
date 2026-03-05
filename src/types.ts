// ─── User & Auth ────────────────────────────────────────────────────────────

export interface UserProfile {
    id: string;
    name: string;
    rate: number;
    role: 'admin' | 'user';
    orgId: string;
    email?: string;
}

// ─── Organizations ───────────────────────────────────────────────────────────

export interface Organization {
    id: string;
    name: string;
    slug: string;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskStatus = 'Pending' | 'In Progress' | 'Blocked' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Task {
    id: string;
    title: string;
    description: string;
    location: string;
    assignedTo: string;
    dueDate: string;
    priority: TaskPriority;
    status: TaskStatus;
    createdAt: number;
    jobName?: string;
    orgId?: string;
}

// ─── Subtasks ─────────────────────────────────────────────────────────────────

export interface SubTask {
    id: string;
    taskId: string;
    title: string;
    completed: boolean;
    completedBy: string | null;
    completedAt: number | null;
    sortOrder: number;
    photoUrl: string | null;
    notes: string | null;
    createdAt: number;
}

// ─── Time Entries ─────────────────────────────────────────────────────────────

export interface TimeEntry {
    id: string;
    userId: string;
    userName: string;
    startTime: number;
    endTime: number | null;
    status: 'active' | 'completed';
    jobName?: string;
    notes?: string;
    totalPay?: number;
    orgId?: string;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface Job {
    id: string;
    name: string;
    address: string;
    active: boolean;
}

// ─── Views ────────────────────────────────────────────────────────────────────

export type EmployeeView = 'tasks' | 'timeclock' | 'schedule';
export type AdminView = 'dashboard' | 'tasks' | 'employees' | 'jobs' | 'time';
