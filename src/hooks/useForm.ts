import { useState, useCallback } from 'react';

export function useForm<T extends Record<string, any>>(initialValues: T) {
    const [values, setValues] = useState<T>(initialValues);

    const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
        setValues(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleChange = useCallback((field: keyof T) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setValues(prev => ({ ...prev, [field]: e.target.value }));
    }, []);

    const reset = useCallback((newValues?: T) => {
        setValues(newValues ?? initialValues);
    }, [initialValues]);

    return { values, setField, handleChange, reset, setValues };
}
