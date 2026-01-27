import * as React from 'react';
import { LucideIcon, X } from 'lucide-react';

interface ConceptSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: React.ReactNode;
    icon?: LucideIcon;
    badge?: string;
    bgImage?: string;
}

export function ConceptSheet({ isOpen, onClose, title, description, icon: Icon, badge, bgImage }: ConceptSheetProps) {
    const [mounted, setMounted] = React.useState(false);

    // Handle mounting animation state
    React.useEffect(() => {
        if (isOpen) {
            setMounted(true);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setMounted(false), 300);
            document.body.style.overflow = '';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!mounted && !isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-end justify-center sm:items-center transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[4px] transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className={`w-full max-w-md bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[20px] sm:rounded-[20px] overflow-hidden shadow-2xl relative transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) transform ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-full sm:translate-y-10 sm:scale-95'
                    }`}
                style={{ maxHeight: '85vh' }}
            >
                {/* Header with Icon & Banner */}
                <div
                    className="relative p-5 sm:p-6 border-b border-zinc-100 dark:border-white/5 bg-cover bg-center overflow-hidden"
                    style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}}
                >
                    {/* Overlay */}
                    {bgImage ? (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
                    ) : (
                        <div className="absolute inset-0 bg-white dark:bg-[#1C1C1E]" />
                    )}

                    <div className="relative z-10 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                            {Icon && (
                                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm backdrop-blur-md ${bgImage
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                                    }`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                            )}
                            <div className="flex flex-col min-w-0">
                                {badge && (
                                    <span className={`inline-block text-[10px] font-bold uppercase tracking-widest mb-0.5 opacity-80 ${bgImage ? 'text-white' : 'text-zinc-500'}`}>
                                        {badge}
                                    </span>
                                )}
                                <h2 className={`text-lg sm:text-xl font-bold tracking-tight truncate ${bgImage ? 'text-white' : 'text-zinc-900 dark:text-white'
                                    }`}>
                                    {title}
                                </h2>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className={`shrink-0 p-2 rounded-full transition-colors ${bgImage
                                ? 'bg-white/10 text-white hover:bg-white/20'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'
                                }`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="overflow-y-auto p-8 space-y-6 bg-[#F2F2F7] dark:bg-[#000000]">
                    <div className="prose prose-zinc dark:prose-invert prose-p:leading-relaxed prose-p:text-zinc-600 dark:prose-p:text-zinc-300 sm:text-[17px] max-w-none">
                        {description}
                    </div>
                </div>
            </div>
        </div>
    );
}
