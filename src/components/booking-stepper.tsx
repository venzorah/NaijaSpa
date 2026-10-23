import { BOOKING_STEPS } from "@/lib/booking-ui";

export function BookingStepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="grid grid-cols-4 gap-1 text-[11px]" aria-label="Booking steps">
      {BOOKING_STEPS.map((step) => {
        const done = step.n < current;
        const active = step.n === current;
        return (
          <li key={step.n} className="flex min-w-0 flex-col items-center gap-1 text-center">
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-bold ${
                active ? "bg-forest text-white" : done ? "bg-gold/25 text-goldink" : "bg-elev text-ink2"
              }`}
            >
              {step.n}
            </span>
            <span className={`leading-tight ${active ? "font-semibold text-ink" : "text-ink2"}`}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
