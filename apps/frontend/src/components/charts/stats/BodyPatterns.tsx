import * as React from 'react';
import { CARD_DIVIDE, SECTION_CAPTION, STATS_CARD } from './statsStyles';

export interface Pattern {
  category: 'symptom' | 'mood' | 'energy' | 'libido';
  phase: 'Period' | 'Follicular' | 'Ovulatory' | 'Luteal';
  text: string;
}

interface BodyPatternsProps {
  patterns: Pattern[];
}

// Category labels mapped to friendly display strings.
const CATEGORY_LABEL: Record<Pattern['category'], string> = {
  symptom: 'Symptom',
  mood: 'Mood',
  energy: 'Energy',
  libido: 'Libido',
};

/**
 * Component rendering user patterns derived from logged data.
 * Restricts styling to monochrome tones to ensure color is reserved for fertility status per BRAND.md.
 * Returns null if the patterns array is empty.
 */
export function BodyPatterns({ patterns }: BodyPatternsProps) {
  if (!patterns || patterns.length === 0) return null;

  return (
    <section>
      <h3 className={SECTION_CAPTION}>Your patterns</h3>
      <div className={`${STATS_CARD} overflow-hidden ${CARD_DIVIDE}`}>
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
