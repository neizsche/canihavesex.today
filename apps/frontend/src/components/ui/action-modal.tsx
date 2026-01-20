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
    widthClass = "max-w-md",
    hidePrivacyFooter = false
}: ActionModalProps) {

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className={`w-full ${widthClass} bg-white p-10 md:p-12 rounded-[2rem] shadow-[0_8px_80px_-12px_rgba(0,0,0,0.25)] border border-slate-200/50 relative overflow-hidden animate-in zoom-in-95 duration-300`}>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-4 h-10 w-10 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-full"
                    onClick={onClose}
                >
                    <X className="w-5 h-5" />
                </Button>

                <div className="text-center space-y-10">
                    {/* Header Branding */}
                    <div className="flex flex-col items-center gap-5">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="w-20 h-20 mix-blend-multiply"
                        />
                        <div>
                            <div className="text-2xl font-outfit tracking-tighter text-slate-900 mb-2">
                                {BRAND.PREFIX}<span className="text-rose-500 font-extrabold italic">{BRAND.HIGHLIGHT}</span>{BRAND.SUFFIX}
                            </div>
                            {title && (
                                <div className="mt-3 text-slate-500 font-medium text-lg">
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
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start gap-3 text-left">
                            <ShieldCheck className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                {HERO.PRIVACY_NOTE}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
