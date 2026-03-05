import React from 'react';

interface AlertDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    destructive?: boolean;
}

export default function AlertDialog({
    open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
    onConfirm, onCancel, destructive = false,
}: AlertDialogProps) {
    if (!open) return null;

    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                </div>
                <div className="modal-body">
                    <p style={{ margin: 0, color: 'var(--color-text-2)', fontSize: '0.9rem', lineHeight: 1.5 }}>{message}</p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
                    <button className={`btn ${destructive ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}
