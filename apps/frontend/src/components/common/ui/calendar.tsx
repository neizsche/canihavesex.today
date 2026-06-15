import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const components = props.components ?? {};
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-1', className)}
      classNames={{
        months: 'flex flex-col space-y-4',
        month: 'space-y-4',
        caption: 'flex items-center justify-between',
        caption_label: 'text-base font-semibold',
        nav: 'flex items-center gap-1',
        nav_button: cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-9 w-9'),
        nav_button_previous: '',
        nav_button_next: '',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'w-10 text-center text-xs font-medium text-muted-foreground',
        row: 'flex w-full',
        cell: 'relative h-10 w-10 p-0 text-center text-sm',
        day: cn(
          'h-10 w-10 rounded-full p-0 font-normal tabular-nums',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background'
        ),
        day_selected: 'bg-primary text-primary-foreground',
        day_today: 'text-foreground',
        day_outside: 'text-muted-foreground/40',
        day_disabled: 'text-muted-foreground/30 opacity-60',
        day_range_middle: 'aria-selected:bg-muted aria-selected:text-foreground',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) => {
          if (props.orientation === 'left') return <ChevronLeft className="h-4 w-4" />;
          return <ChevronRight className="h-4 w-4" />;
        },
        ...components,
      }}
      {...props}
    />
  );
}
