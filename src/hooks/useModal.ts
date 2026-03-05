import { useState, useCallback } from 'react';

export function useModal() {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const show = useCallback(() => setOpen(true), []);
    const hide = useCallback(() => { setOpen(false); setSaving(false); }, []);

    return { open, saving, show, hide, setSaving };
}
