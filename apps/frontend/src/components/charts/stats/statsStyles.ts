/**
 * Shared visual language for the Stats tab — one source of truth so the
 * summary, chart, patterns and history cards read as one family. Plain literal
 * strings so Tailwind's content scanner still detects every utility.
 */

// Standard grouped card (Apple-Health inset style).
export const STATS_CARD = 'bg-card rounded-2xl border border-border/30';

// Tiny uppercase section caption that floats above a card.
export const SECTION_CAPTION =
  'text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground/70 mb-2.5 ml-1';

// Hairline divider between rows inside a card.
export const CARD_DIVIDE = 'divide-y divide-border/30';

// iOS accent blue — the only non-fertility colour on this screen (data + links).
// Backed by the app-wide `--accent` token (globals.css).
export const ACCENT_TEXT = 'text-accent';
