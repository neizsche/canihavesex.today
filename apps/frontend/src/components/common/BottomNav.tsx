import { cn } from '@/lib/utils';

type NavKey = 'today' | 'log' | 'chart' | 'settings' | 'onboarding';

type IconProps = { active: boolean; className?: string };

const outlineProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const solidProps = {
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': true,
};

/* Today — house (Instagram home) */
function HomeIcon({ active, className }: IconProps) {
  return active ? (
    <svg {...solidProps} className={className}>
      <path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.06l-8.69-8.69a2.25 2.25 0 0 0-3.18 0l-8.69 8.69a.75.75 0 1 0 1.06 1.06l8.69-8.69Z" />
      <path d="m12 5.43 8.16 8.16c.03.03.06.06.09.09v6.19c0 1.04-.84 1.88-1.88 1.88H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.63a1.88 1.88 0 0 1-1.88-1.88v-6.19l.09-.09L12 5.43Z" />
    </svg>
  ) : (
    <svg {...outlineProps} className={className}>
      <path d="m3 9.4 9-6.9 9 6.9v9.85a1.5 1.5 0 0 1-1.5 1.5H15v-6.6a1.2 1.2 0 0 0-1.2-1.2h-3.6a1.2 1.2 0 0 0-1.2 1.2v6.6H4.5a1.5 1.5 0 0 1-1.5-1.5Z" />
    </svg>
  );
}

/* Log — plus in a rounded square (Instagram create) */
function LogIcon({ active, className }: IconProps) {
  return active ? (
    <svg {...solidProps} className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm5 5.25a1 1 0 1 0-2 0V11H8.25a1 1 0 1 0 0 2H11v2.75a1 1 0 1 0 2 0V13h2.75a1 1 0 1 0 0-2H13V8.25Z"
      />
    </svg>
  ) : (
    <svg {...outlineProps} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 8.25v7.5M8.25 12h7.5" />
    </svg>
  );
}

/* Chart — calendar */
function CalendarIcon({ active, className }: IconProps) {
  return active ? (
    <svg {...solidProps} className={className}>
      <path d="M8 2a1 1 0 0 0-1 1v1H6a3 3 0 0 0-3 3v1h18V7a3 3 0 0 0-3-3h-1V3a1 1 0 1 0-2 0v1H9V3a1 1 0 0 0-1-1Z" />
      <path d="M3 10v8.5A3 3 0 0 0 6 21.5h12a3 3 0 0 0 3-3V10H3Z" />
    </svg>
  ) : (
    <svg {...outlineProps} className={className}>
      <rect x="3" y="4.5" width="18" height="17" rx="3" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

/* Settings — profile circle (Instagram account) */
function ProfileIcon({ active, className }: IconProps) {
  return active ? (
    <svg {...solidProps} className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.69 19.1A9.72 9.72 0 0 0 21.75 12c0-5.39-4.36-9.75-9.75-9.75S2.25 6.61 2.25 12a9.72 9.72 0 0 0 3.06 7.1A9.72 9.72 0 0 0 12 21.75a9.72 9.72 0 0 0 6.69-2.65Zm-12.54-1.29A7.49 7.49 0 0 1 12 15a7.49 7.49 0 0 1 5.85 2.81A8.22 8.22 0 0 1 12 20.25a8.22 8.22 0 0 1-5.85-2.44ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
      />
    </svg>
  ) : (
    <svg {...outlineProps} className={className}>
      <path d="M17.98 18.73A7.49 7.49 0 0 0 12 15.75a7.49 7.49 0 0 0-5.98 2.98m11.96 0a9 9 0 1 0-11.96 0m11.96 0A8.97 8.97 0 0 1 12 21a8.97 8.97 0 0 1-5.98-2.27M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

export function BottomNav(props: { active: NavKey }) {
  if (props.active === 'onboarding') return null;

  const active = props.active;

  const items: Array<{ key: NavKey; href: string; label: string; Icon: (p: IconProps) => JSX.Element }> = [
    { key: 'today', href: '#/today', label: 'Today', Icon: HomeIcon },
    { key: 'log', href: '#/log', label: 'Log', Icon: LogIcon },
    { key: 'chart', href: '#/chart', label: 'Chart', Icon: CalendarIcon },
    { key: 'settings', href: '#/settings', label: 'Settings', Icon: ProfileIcon },
  ];

  return (
    <nav
      aria-label="Primary"
      className="flex-shrink-0 border-t border-black/5 dark:border-white/10 bg-background/80 backdrop-blur-xl"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pt-2.5 pb-1">
        {items.map(({ key, href, label, Icon }) => {
          const isActive = active === key;
          return (
            <a
              key={key}
              href={href}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className="flex items-center justify-center rounded-xl p-2 transition-transform active:scale-90"
            >
              <Icon
                active={isActive}
                className={cn(
                  'h-[26px] w-[26px] transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              />
            </a>
          );
        })}
      </div>
    </nav>
  );
}
