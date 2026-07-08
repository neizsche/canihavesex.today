/**
 * Single source of truth for the log screen's visual language.
 *
 * Every repeated Tailwind pattern across LogScreen / LogPrimarySignals /
 * LogWellnessSection / LogControls lives here, so the whole flow can be
 * retuned from one place. Values are plain literal strings (composed only by
 * simple concatenation) so Tailwind's content scanner still detects every
 * utility — never build these from computed fragments.
 */
import { IOS_INDIGO, IOS_ORANGE, IOS_RED } from '@/lib/iosColors';

// — Accent colours ————————————————————————————————————————————————
// iOS blue — primary interactive colour: filled cells, links, "+ Add".
// Backed by the app-wide `--accent` token (globals.css) so light/dark are
// handled centrally — the single source of truth for the accent blue.
export const ACCENT_FILL = 'bg-accent';
export const ACCENT_TEXT = 'text-accent';
// iOS red — the bleeding identity colour: its tile and its toggle. Shares the
// app-wide systemRed (`--destructive`) via the iOS palette.
export const BLEEDING_FILL = IOS_RED;

// — Icon tiles ————————————————————————————————————————————————————
// 30px squircle. The row-divider inset (ROW_DIVIDER) is derived from this:
//   row px-4 (16) + tile (30) + gap-3 (12) = 58px → dividers meet the label.
const TILE_GEOMETRY = 'w-[30px] h-[30px] rounded-[9px] shrink-0 flex items-center justify-center';
const solidTile = (color: string) => `${TILE_GEOMETRY} shadow-sm ${color}`;

// Semantic tile colours — true iOS system colours (light / dark) for the
// primary signals, broader palette for the wellness fields. Retune here.
export const TILE = {
  bleeding: solidTile(BLEEDING_FILL),
  cervical: solidTile(ACCENT_FILL),
  temperature: solidTile(IOS_ORANGE),
  lh: solidTile(IOS_INDIGO),
  symptoms: solidTile('bg-green-500'),
  mood: solidTile('bg-amber-500'),
  energy: solidTile('bg-sky-500'),
  sleep: solidTile('bg-indigo-500'),
  libido: solidTile('bg-pink-500'),
  sex: solidTile('bg-purple-500'),
  factors: solidTile('bg-zinc-400 dark:bg-zinc-600'),
  // Notes is a tinted tile with a coloured glyph (pair with NOTES_ICON).
  notes: `${TILE_GEOMETRY} bg-yellow-500/10`,
} as const;
export const TILE_LABEL = 'text-[17px] text-zinc-900 dark:text-white font-medium';
export const NOTES_ICON = 'icon-sm text-yellow-500';

// — Dividers ——————————————————————————————————————————————————————
// Between-row hairline, inset to the label (see tile note above).
export const ROW_DIVIDER = 'h-px bg-zinc-100 dark:bg-zinc-800 ml-[58px]';
// Inside an expanded row — aligns to the control below it, not the label.
export const SUB_DIVIDER = 'h-px bg-zinc-100 dark:bg-zinc-800';

// — Segmented control (flow, LH test, wellness pill groups) ————————————
export const SEGMENT_TRACK = 'flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl';
export const SEGMENT_ITEM = 'flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all';
// Selected knob — pair with one of the text colours below.
export const SEGMENT_ON = 'bg-white dark:bg-zinc-600 shadow-sm ring-1 ring-black/5';
export const SEGMENT_OFF = 'text-zinc-500 dark:text-zinc-400';
export const SEGMENT_TEXT_NEUTRAL = 'text-zinc-900 dark:text-white';
export const SEGMENT_TEXT_MENSTRUAL = 'text-rose-600 dark:text-rose-300';

// — Selectable option cells + chips ————————————————————————————————
// Quiet idle fill shared by the cervical-fluid grid and multi-select chips.
export const OPTION_IDLE =
  'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60';

// Cervical fluid grid cell.
export const CERVICAL_CELL =
  'py-2.5 px-3 rounded-xl text-[15px] font-medium text-center transition-all active:scale-[0.98]';
export const CERVICAL_ON = `${ACCENT_FILL} text-white font-semibold shadow-sm`;

// Multi-select chip + its per-group active tints.
export const CHIP =
  'py-1.5 px-3 rounded-full text-[13px] font-medium transition-all active:scale-[0.97]';
export const CHIP_ON_SYMPTOMS = 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
export const CHIP_ON_MOOD = 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';
export const CHIP_ON_FACTORS = 'bg-zinc-300 dark:bg-zinc-600 text-zinc-800 dark:text-zinc-100';

// — Primary CTA + pinned action bar ————————————————————————————————
export const PRIMARY_BUTTON =
  'w-full h-12 text-[17px] font-semibold bg-accent hover:bg-[#0066D6] text-white rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]';
export const ACTION_BAR =
  'shrink-0 border-t border-black/5 dark:border-white/10 bg-background/80 backdrop-blur-xl';
