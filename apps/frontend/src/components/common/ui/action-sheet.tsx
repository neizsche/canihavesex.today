import * as React from 'react';

export interface ActionSheetAction {
    label: string;
    onClick: () => void;
    isDestructive?: boolean;
}

interface ActionSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    actions: ActionSheetAction[];
}

export function ActionSheet({ isOpen, onClose, title, description, actions }: ActionSheetProps) {
    const [mounted, setMounted] = React.useState(false);

    // Handle mounting animation state
    React.useEffect(() => {
        if (isOpen) {
            setMounted(true);
        } else {
            const timer = setTimeout(() => setMounted(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!mounted && !isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-end justify-center px-4 pb-8 sm:items-center sm:pb-0 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                onClick={onClose}
            />

            <div
                className={`w-full max-w-sm space-y-2 relative transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-10 scale-95'
                    }`}
            >
                {/* Action Group */}
                <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-2xl">
                    {(title || description) && (
                        <div className="px-4 py-4 text-center border-b border-black/5 dark:border-white/5">
                            {title && (
                                <div className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 leading-tight">
                                    {title}
                                </div>
                            )}
                            {description && (
                                <div className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-snug mt-1">
                                    {description}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
                        {actions.map((action, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    action.onClick();
                                    onClose();
                                }}
                                className={`w-full py-4 text-[20px] font-normal transition-colors active:bg-black/5 dark:active:bg-white/5 ${action.isDestructive
                                        ? 'text-[#FF3B30] dark:text-[#FF453A]'
                                        : 'text-[#007AFF] dark:text-[#0A84FF]'
                                    }`}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cancel Group */}
                <button
                    onClick={onClose}
                    className="w-full bg-white dark:bg-[#1C1C1E] py-4 rounded-2xl text-[20px] font-semibold text-[#007AFF] dark:text-[#0A84FF] active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors shadow-2xl"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
