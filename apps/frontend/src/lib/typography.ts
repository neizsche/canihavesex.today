/**
 * Shared text styles — the typographic siblings of `iosColors.ts`. Cross-cutting
 * text roles that were being re-implemented per screen live here so a given
 * element reads the same everywhere. Import into a screen's `*Styles.ts` or use
 * directly. Plain literal strings for Tailwind's content scanner.
 */

// Tiny uppercase caption that floats above a grouped card/section (the `<h3>`
// over a Stats card, the "Regularity"/"Options" labels in Settings, etc.).
// Type + colour only — callers add their own spacing (mb / ml / px).
export const SECTION_CAPTION =
  'text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground/70';
