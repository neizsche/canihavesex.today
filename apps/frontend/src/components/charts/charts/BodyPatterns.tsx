import * as React from 'react';

export interface Pattern {
  category: 'symptom' | 'mood' | 'energy' | 'libido';
  phase: 'Period' | 'Follicular' | 'Ovulatory' | 'Luteal';
  text: string;
}

interface BodyPatternsProps {
  patterns: Pattern[];
}

// Short eyebrow per category — the quiet label, the sentence carries the detail.
const CATEGORY_LABEL: Record<Pattern['category'], string> = {
  symptom: 'Symptom',
  mood: 'Mood',
  energy: 'Energy',
  libido: 'Libido',
};

/**
 * Layer 2 — "Your Patterns": a few plain, non-diagnostic sentences derived from
 * the user's own logs. Monochrome by brand (colour signals fertility status
 * only); hierarchy comes from a quiet category eyebrow over each sentence.
 * Renders nothing until the backend surfaces a sufficiently-supported pattern.
 */
export function BodyPatterns({ patterns }: BodyPatternsProps) {
  if (!patterns || patterns.length === 0) return null;

  return (
    <section>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground/70 mb-2.5 ml-1">
        Your Patterns
      </h3>
      <div className="bg-card rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/30">
        {patterns.map((p) => (
          <div key={p.category} className="px-4 py-3.5">
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/80">
              {CATEGORY_LABEL[p.category]}
            </div>
            <p className="mt-1 text-[15px] text-foreground leading-snug">{p.text}</p>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-muted-foreground/80 mt-2.5 ml-1 leading-relaxed">
        Based on your own logs — descriptive, not medical advice.
      </p>
    </section>
  );
}
