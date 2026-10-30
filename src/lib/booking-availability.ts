/** All appointment hours are interpreted in Africa/Lagos (UTC+1, no DST). */
export function appointmentWindow(startsAt: Date, endsAt: Date) {
  if (!Number.isFinite(startsAt.getTime()) || startsAt <= new Date() || endsAt <= startsAt) {
    throw Object.assign(new Error("Choose a valid future appointment"), { status: 400 });
  }
  const start = new Date(startsAt.getTime() + 3_600_000);
  const end = new Date(endsAt.getTime() + 3_600_000);
  if (start.toISOString().slice(0, 10) !== end.toISOString().slice(0, 10)) {
    throw Object.assign(new Error("Appointments must finish on the same day"), { status: 400 });
  }
  return {
    weekday: start.getUTCDay(),
    startMin: start.getUTCHours() * 60 + start.getUTCMinutes(),
    endMin: end.getUTCHours() * 60 + end.getUTCMinutes() + (end.getUTCSeconds() ? 1 : 0)
  };
}

export function matchingAvailability(
  slots: { weekday: number; startMin: number; endMin: number; bufferMin: number; staffId: string | null }[],
  staffId: string | null,
  window: ReturnType<typeof appointmentWindow>
) {
  const specific = slots.filter((s) => s.staffId === staffId);
  const applicable = specific.length ? specific : slots.filter((s) => s.staffId === null);
  return applicable.find((s) => s.weekday === window.weekday && s.startMin <= window.startMin && s.endMin >= window.endMin);
}
