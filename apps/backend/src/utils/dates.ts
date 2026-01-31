const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_TZ_OFFSET_MINUTES = 14 * 60;

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

export function formatIsoDateLocal(date: Date): string {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatIsoDateUTC(date: Date): string {
    return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function parseIsoDateToUtcMs(isoDate: string): number {
    const [year, month, day] = isoDate.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
}

export function addDaysIso(isoDate: string, days: number): string {
    const nextMs = parseIsoDateToUtcMs(isoDate) + (days * MS_PER_DAY);
    return formatIsoDateUTC(new Date(nextMs));
}

export function daysBetweenIso(start: string, end: string): number {
    const startMs = parseIsoDateToUtcMs(start);
    const endMs = parseIsoDateToUtcMs(end);
    return Math.floor((endMs - startMs) / MS_PER_DAY);
}

export function generateIsoDateRange(start: string, end: string): string[] {
    const dates: string[] = [];
    let currentMs = parseIsoDateToUtcMs(start);
    const endMs = parseIsoDateToUtcMs(end);
    while (currentMs <= endMs) {
        dates.push(formatIsoDateUTC(new Date(currentMs)));
        currentMs += MS_PER_DAY;
    }
    return dates;
}

export function parseTimezoneOffsetMinutes(value: unknown): number | undefined {
    if (value == null) return undefined;
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(parsed)) return undefined;
    const offset = Math.trunc(parsed);
    if (Math.abs(offset) > MAX_TZ_OFFSET_MINUTES) return undefined;
    return offset;
}

export function isoDateForOffset(date: Date, offsetMinutes?: number | null): string {
    if (offsetMinutes == null || !Number.isFinite(offsetMinutes)) {
        return formatIsoDateLocal(date);
    }
    const adjustedMs = date.getTime() - (offsetMinutes * 60000);
    return formatIsoDateUTC(new Date(adjustedMs));
}

export function isoToday(offsetMinutes?: number | null): string {
    return isoDateForOffset(new Date(), offsetMinutes);
}
