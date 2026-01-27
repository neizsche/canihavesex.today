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
            <div className="relative h-[160px] overflow-hidden">
                {bgImage && (
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${bgImage})` }}
                    />
                )}

                {/* Gradient Overlay */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: `linear-gradient(180deg, ${shadowColor?.replace('0.45', '0.15') || 'rgba(0,0,0,0.15)'} 0%, ${shadowColor?.replace('0.45', '0.4') || 'rgba(0,0,0,0.4)'} 100%)`
                    }}
                />

                {/* Back Button - Top Left */}
                <div className="absolute top-5 left-5 z-10">
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md border border-white/20 text-foreground hover:bg-white dark:hover:bg-black/80 transition-all shadow-lg"
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
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Overlapping Content Container starts here in parent, but titles are part of hero feel */}
            {/* We will render titles in the parent container context or here? 
                The reference design had titles INSIDE the white content area overlapping the image.
                So strictly speaking, the image is one part, the titles are in the content area.
                Let's keep this component just for the Image/Header part for now to match current structure?
                Actually, the titles were:
                    <div className="text-center space-y-2 mb-8">
                        <h1>{title}</h1> ...
                    </div>
                So let's export a HeroHeader and a HeroTitles maybe?
                Or just keep the image part here as 'InsightHeaderImage'
            */}
        </div>
    );
}

// Since the titles are inside the scrolled content area background, they should be separate.
// Let's call this InsightHeaderImage instead? Or just keep it as is and the parent manages the titles.
