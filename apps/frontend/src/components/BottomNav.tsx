import { BarChart3, ClipboardList, Settings, ShieldCheck } from 'lucide-react';

import { cn } from '../lib/utils';

type NavKey = 'today' | 'log' | 'chart' | 'settings';

export function BottomNav(props: { active: NavKey }) {
  const items: Array<{ key: NavKey; href: string; label: string; Icon: any }> = [
    { key: 'today', href: '/', label: 'Today', Icon: ShieldCheck },
    { key: 'log', href: '/log', label: 'Log', Icon: ClipboardList },
    { key: 'chart', href: '/chart', label: 'Chart', Icon: BarChart3 },
    { key: 'settings', href: '/settings', label: 'Settings', Icon: Settings },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
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
              <Icon className={cn('h-5 w-5', active ? 'text-foreground' : 'text-muted-foreground')} />
              <span>{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
