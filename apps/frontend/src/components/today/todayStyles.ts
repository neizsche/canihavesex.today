/**
 * Single source of truth for the Today screen's visual language — the sibling
 * of `logStyles.ts` and the Stats tab's `statsStyles.ts`. Shared role-names
 * (`ACCENT_TEXT`, `SECTION_CAPTION`) are kept identical across those files so a
 * concept reads the same everywhere, even where the tuned value differs.
 *
 * Convention across the app's style files:
 *   • `<section>Styles.ts` holds visual Tailwind constants (this file).
 *   • `<section>Shared.ts` holds types + engine/config (see `todayShared.ts`).
 * Values are plain literal strings (composed only by simple concatenation) so
 * Tailwind's content scanner still detects every utility — never build these
 * from computed fragments.
 */

// — Accent ————————————————————————————————————————————————————————
// iOS blue — the one interactive colour (matches log/stats ACCENT_TEXT).
// Backed by the app-wide `--accent` token (globals.css).
export const ACCENT_TEXT = 'text-accent';

// — Centred state shell (log-prompt / paused empty states) ————————————
export const STATE_CONTAINER =
  'flex-1 flex flex-col items-center justify-center px-8 text-center';
// Big display verdict/heading. Pair with a max-width on the subtitle below.
export const DISPLAY_HEADING =
  'text-[30px] font-extrabold tracking-[-0.04em] text-zinc-900 dark:text-white leading-[1.1]';
// Muted supporting line under the heading — callers add their own `max-w-[…]`.
export const STATE_SUBTITLE = 'mt-3 text-[15px] leading-relaxed text-zinc-400 dark:text-zinc-600';

// — Raised white surface (the pill button + paused circle) ————————————
export const SURFACE_RAISED =
  'bg-card border border-zinc-200 dark:border-zinc-800';
// The "Log Today" pill, shared by the prompt and paused states.
export const LOG_PILL_BUTTON = `mt-8 px-9 py-3.5 rounded-full ${SURFACE_RAISED} text-[17px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 active:scale-[0.98] transition-transform`;

// — Insights sheet — grouped inset card ————————————————————————————
export const INSET_CARD = 'rounded-2xl bg-black/[0.03] px-4 dark:bg-white/[0.04]';
export const INSET_DIVIDE = 'divide-y divide-black/[0.05] dark:divide-white/[0.06]';
// Tiny uppercase caption above a card — the app-wide shared style.
export { SECTION_CAPTION } from '@/lib/typography';
