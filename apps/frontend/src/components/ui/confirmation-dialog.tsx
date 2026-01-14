import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText: string; // Text user must type to confirm (e.g., "DELETE ACCOUNT")
    variant?: 'danger' | 'warning';
}

export function ConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText,
    variant = 'danger',
}: ConfirmationDialogProps) {
    const [inputValue, setInputValue] = React.useState('');
    const dialogRef = React.useRef<HTMLDialogElement>(null);

    React.useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal();
            setInputValue('');
        } else {
            dialogRef.current?.close();
        }
    }, [isOpen]);

    const isConfirmEnabled = inputValue === confirmText;

    const handleConfirm = () => {
        if (isConfirmEnabled) {
            onConfirm();
            onClose();
        }
    };

    const handleCancel = () => {
        setInputValue('');
        onClose();
    };

    return (
        <dialog
            ref={dialogRef}
            className="fixed inset-0 z-50 m-auto w-[min(92vw,440px)] rounded-xl border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/50"
            onClose={handleCancel}
        >
            <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-100 dark:bg-red-950' : 'bg-orange-100 dark:bg-orange-950'
                        }`}>
                        <AlertTriangle className={`h-5 w-5 ${variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                            }`} />
                    </div>
                    <div className="flex-1 space-y-1">
                        <h2 className="text-lg font-semibold">{title}</h2>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>

                {/* Confirmation Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                        Type <span className="font-mono font-bold text-destructive">{confirmText}</span> to confirm
                    </label>
                    <input
                        type="text"
                        className="h-12 w-full rounded-lg border bg-background px-4 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder={confirmText}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && isConfirmEnabled) {
                                handleConfirm();
                            } else if (e.key === 'Escape') {
                                handleCancel();
                            }
                        }}
                        autoFocus
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-11"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        className="flex-1 h-11"
                        onClick={handleConfirm}
                        disabled={!isConfirmEnabled}
                    >
                        Confirm
                    </Button>
                </div>
            </div>
        </dialog>
    );
}
