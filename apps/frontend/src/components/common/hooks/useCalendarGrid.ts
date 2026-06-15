import { addDays, startOfDay, startOfWeek, subWeeks } from 'date-fns';

export function useCalendarGrid() {
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const start = subWeeks(weekStart, 4);

  const days: (Date | null)[] = [];
  let currentDate = new Date(start);

  // Generate days with month boundary logic
  while (days.length < 35 && currentDate <= today) {
    const currentMonth = currentDate.getMonth();
    const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

    // If we're at the start of a new month and not the first month, add empty cells to align to next row
    if (days.length > 0 && currentMonth !== start.getMonth() && currentDate.getDay() !== 1) {
      const daysToNextWeek = (8 - currentDate.getDay()) % 7 || 7;
      for (let i = 0; i < daysToNextWeek - 1 && days.length < 35; i++) {
        days.push(null); // Empty cell for month break
      }
    }

    // Add the days of the current week
    for (let i = 0; i < 7; i++) {
      const weekDay = addDays(currentWeekStart, i);
      if (weekDay <= today && days.length < 35) {
        days.push(weekDay);
        currentDate = addDays(weekDay, 1);
      }
    }

    // Move to next week
    currentDate = addDays(currentWeekStart, 7);
  }

  return { days, today, start };
}
