import { neon } from '@neondatabase/serverless';

const databaseUrl = import.meta.env.VITE_DATABASE_URL;

if (!databaseUrl) {
    throw new Error('VITE_DATABASE_URL is not defined in environment variables');
}

export const sql = neon(databaseUrl);
