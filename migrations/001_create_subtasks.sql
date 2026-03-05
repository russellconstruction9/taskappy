-- Create subtasks table for task checklist items
CREATE TABLE IF NOT EXISTS public.subtasks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    completed  BOOLEAN NOT NULL DEFAULT false,
    completed_by TEXT,
    completed_at BIGINT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    photo_url  TEXT,
    notes      TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint
);

-- Index for fast lookup by task
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);

-- Enable RLS (match pattern of other tables)
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (org-level filtering happens at app layer)
CREATE POLICY "Allow all for authenticated" ON public.subtasks
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
