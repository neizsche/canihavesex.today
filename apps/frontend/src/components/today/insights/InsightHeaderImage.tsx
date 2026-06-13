import * as React from 'react';

interface InsightHeroProps {
    title: string;
    subtitle: string;
    bgImage?: string;
    shadowColor?: string;
    onClose: () => void;
}

export function InsightHeaderImage({ title, subtitle, bgImage, shadowColor, onClose }: InsightHeroProps) {
    return (
        <div className="relative">
            {/* Hero Image Section */}
            <div className="relative h-[200px] overflow-hidden">
                {bgImage && (
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                        style={{ backgroundImage: `url(${bgImage})` }}
                    />
                )}

                {/* Gradient Overlay */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: `linear-gradient(180deg, ${shadowColor?.replace('0.45', '0.05') || 'rgba(0,0,0,0.05)'} 0%, ${shadowColor?.replace('0.45', '0.6') || 'rgba(0,0,0,0.6)'} 100%)`
                    }}
                />

                {/* Back Button - Top Left */}
                <div className="absolute top-6 left-6 z-10">
                    <button
                        onClick={onClose}
                        className="p-3 rounded-full bg-black/20 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 text-white hover:bg-black/40 transition-all shadow-sm"
                        aria-label="Close"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
