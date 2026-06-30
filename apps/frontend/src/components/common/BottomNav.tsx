import { BarChart3, ClipboardList, Heart, Settings } from 'lucide-react';

import { cn } from '@/lib/utils';

type NavKey = 'today' | 'log' | 'chart' | 'settings' | 'onboarding';

export function BottomNav(props: { active: NavKey }) {
  if (props.active === 'onboarding') return null;

  const items: Array<{ key: NavKey; href: string; label: string; Icon: any }> = [
    { key: 'today', href: '#/today', label: 'Today', Icon: Heart },
    { key: 'log', href: '#/log', label: 'Log', Icon: ClipboardList },
    { key: 'chart', href: '#/chart', label: 'Chart', Icon: BarChart3 },
    { key: 'settings', href: '#/settings', label: 'Settings', Icon: Settings },
  ];

  return (
    <nav
      aria-label="Primary"
      className="flex-shrink-0 border-t border-black/5 dark:border-white/10 bg-background/80 backdrop-blur-xl"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
    >
      <div className="mx-auto grid max-w-md grid-cols-4 px-4 py-2">
        {items.map(({ key, href, label, Icon }) => {
          const active = props.active === key;
          return (
            <a
              key={key}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-medium',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn('icon-md', active ? 'text-foreground' : 'text-muted-foreground')}
              />
              <span>{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
