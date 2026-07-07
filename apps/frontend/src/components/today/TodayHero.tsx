import { cn } from '@/lib/utils';

/**
 * The shared Today hero — status phase, verdict, and subtitle. Single source of
 * truth for the block rendered both on the Today ready screen and atop the
 * insights sheet, so the sheet reads as a continuation of the screen behind it.
 */
export function TodayHero({
  phase,
  title,
  accent,
  dot,
  subtitle,
  subtitleWarn = false,
  as: Heading = 'h1',
}: {
  phase?: string;
  title: string;
  accent: string;
  dot: string;
  subtitle: string;
  subtitleWarn?: boolean;
  as?: 'h1' | 'h2';
}) {
  return (
    <>
      {phase && (
        <div
          className={cn(
            'mb-4 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em]',
            accent
          )}
        >
          <div className={cn('h-1.5 w-1.5 rounded-full', dot)} />
          {phase}
        </div>
      )}

      <Heading className="text-[42px] font-extrabold tracking-[-0.05em] leading-none text-zinc-900 dark:text-white">
        {title}
      </Heading>

      <p
        className={cn(
          'mt-3 max-w-[260px] text-[15px] leading-relaxed',
          subtitleWarn
            ? 'font-medium text-amber-500 dark:text-amber-400'
            : 'text-zinc-500 dark:text-zinc-500'
        )}
      >
        {subtitle}
      </p>
    </>
  );
}
