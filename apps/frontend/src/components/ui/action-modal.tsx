import * as React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { Button } from './button';
import { BRAND, HERO } from '../../lib/siteConfig';

interface ActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children?: React.ReactNode;
    widthClass?: string;
    hidePrivacyFooter?: boolean;
}

export function ActionModal({
    isOpen,
    onClose,
    title,
    children,
    widthClass = "max-w-sm",
    hidePrivacyFooter = false
}: ActionModalProps) {

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/90 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className={`w-full ${widthClass} bg-card p-8 rounded-3xl shadow-2xl border border-stone-100 dark:border-stone-800 relative overflow-hidden`}>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-4 h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-full"
                    onClick={onClose}
                >
                    <X className="icon-md" />
                </Button>

                <div className="text-center space-y-8">
                    {/* Header Branding */}
                    <div className="flex flex-col items-center gap-4">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="w-16 h-16 mix-blend-multiply"
                        />
                        <div>
                            <div className="text-xl font-outfit tracking-tighter text-foreground mb-1">
                                {BRAND.PREFIX}<span className="text-rose-500 font-extrabold italic">{BRAND.HIGHLIGHT}</span>{BRAND.SUFFIX}
                            </div>
                            {title && (
                                <div className="mt-2 text-muted-foreground font-medium text-base">
                                    {title}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Body Content */}
                    <div className="space-y-4">
                        {children}
                    </div>

                    {/* Privacy Footer */}
                    {!hidePrivacyFooter && (
                        <div className="bg-muted/30 rounded-2xl p-4 border border-border/50 flex items-start gap-3 text-left">
                            <ShieldCheck className="icon-md text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                {HERO.PRIVACY_NOTE}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
