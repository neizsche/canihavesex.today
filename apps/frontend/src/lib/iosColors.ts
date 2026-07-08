/**
 * iOS system colours used for icon tiles (30px squircles) across the Log
 * fields and the Settings rows. One source of truth so a given colour reads
 * identically in both places — pair with the tile geometry in each screen's
 * `*Styles.ts` / row component. Plain literal strings for Tailwind's scanner.
 */

// systemRed — identical to the app's `--destructive` token, routed through it.
export const IOS_RED = 'bg-destructive';
// systemOrange (light / dark).
export const IOS_ORANGE = 'bg-[#FF9500] dark:bg-[#FF9F0A]';
// systemIndigo (light / dark).
export const IOS_INDIGO = 'bg-[#5856D6] dark:bg-[#5E5CE6]';
// systemGray — neutral tile.
export const IOS_GRAY = 'bg-zinc-500';
