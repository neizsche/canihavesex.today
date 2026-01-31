import * as React from 'react';
import { Button } from './button';
import { ActionModal } from './action-modal';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    actionLabel: string;
    variant?: 'danger' | 'warning';
}

export function ConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title, // ignored in favor of hardcoded "Are you sure?" to match AuthModal style request
    actionLabel,
    variant = 'danger',
}: ConfirmationDialogProps) {

    return (
        <ActionModal
            isOpen={isOpen}
            onClose={onClose}
            title="Are you sure?"
        >
            <div className="space-y-3 pt-2">
                <Button
                    type="button"
                    className={`w-full h-12 text-base font-medium border shadow-sm transition-all rounded-full ${variant === 'danger'
                        ? 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100 hover:border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
                        : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                >
                    {actionLabel}
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="w-full text-muted-foreground hover:text-foreground hover:bg-transparent h-auto py-0 font-medium text-sm"
                >
                    Cancel
                </Button>
            </div>
        </ActionModal>
    );
}
