export const NAV_STACK_KEY = "naijaspa-nav-stack";
export const PENDING_BOOKING_KEY = "naijaspa-pending-booking";

export function isAuthNavPath(path: string) {
  return /^\/(login|register|forgot|reset|find-bookings|shop\/login)(\/|$)/.test(path);
}

export function currentHref(pathname: string, search = "") {
  const query = search.startsWith("?") ? search : search ? `?${search}` : "";
  return `${pathname}${query}`;
}

export function nextNavStack(stack: string[], href: string) {
  if (stack[stack.length - 1] === href) return stack;
  return [...stack, href].slice(-40);
}

export function popNavStack(stack: string[], current: string, options?: { skipAuth?: boolean }) {
  const next = [...stack];
  while (next.length && next[next.length - 1] === current) next.pop();
  if (options?.skipAuth) {
    while (next.length && isAuthNavPath(next[next.length - 1].split("?")[0])) next.pop();
  }
  const previous = next.pop() ?? null;
  return { previous, stack: next };
}

export function sameOriginReferrer(referrer: string, origin: string) {
  if (!referrer) return false;
  try {
    return new URL(referrer).origin === origin;
  } catch {
    return false;
  }
}

export type PendingBooking = {
  serviceId: string;
  locationType?: "spa" | "hotel" | "home";
  details?: string;
  startsAt?: string;
};

export function pendingBookingFromJson(raw: string | null | undefined): PendingBooking | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingBooking;
    if (!parsed?.serviceId || typeof parsed.serviceId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function resumeHrefFromPendingJson(raw: string | null | undefined) {
  const pending = pendingBookingFromJson(raw);
  return pending ? bookingResumePath(pending) : null;
}

export function bookingResumePath(input: PendingBooking, continuePay = true) {
  const q = new URLSearchParams();
  if (input.locationType) q.set("location", input.locationType);
  if (input.startsAt) q.set("startsAt", input.startsAt);
  if (input.details) q.set("details", input.details);
  if (continuePay) q.set("continue", "pay");
  const qs = q.toString();
  return `/book/${encodeURIComponent(input.serviceId)}${qs ? `?${qs}` : ""}`;
}
