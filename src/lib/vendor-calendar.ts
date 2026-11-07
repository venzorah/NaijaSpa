/** Calendar boundaries are always Nigerian business time, independent of server timezone. */
export function lagosDayStart(at = new Date()) {
    const date = new Date(at.getTime() + 3600000).toISOString().slice(0, 10);
    return new Date(`${date}T00:00:00+01:00`);
}
export function lagosDateKey(at: Date) { return new Date(at.getTime() + 3600000).toISOString().slice(0, 10); }
export function lagosWeekStart(at = new Date()) {
    const day = lagosDayStart(at), weekday = new Date(day.getTime() + 3600000).getUTCDay();
    return new Date(day.getTime() - ((weekday + 6) % 7) * 86400000);
}
