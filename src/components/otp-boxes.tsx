"use client";

import { useRef } from "react";

const OTP_LENGTH = 6;

export function OtpBoxes({
  id = "otp",
  value,
  onChange,
  disabled
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);

  function setDigit(index: number, raw: string) {
    const only = raw.replace(/\D/g, "");
    if (!only) {
      onChange(`${digits.slice(0, index)}${digits.slice(index + 1)}`);
      return;
    }
    if (only.length > 1) {
      onChange(only.slice(0, OTP_LENGTH));
      refs.current[Math.min(only.length, OTP_LENGTH) - 1]?.focus();
      return;
    }
    const next = `${digits.slice(0, index)}${only}${digits.slice(index + 1)}`.slice(0, OTP_LENGTH);
    onChange(next);
    if (index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
  }

  return (
    <div role="group" aria-label="6-digit verification code" className="flex justify-between gap-1.5">
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(node) => {
            refs.current[i] = node;
          }}
          id={i === 0 ? id : undefined}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          maxLength={6}
          disabled={disabled}
          value={digits[i] || ""}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              refs.current[i - 1]?.focus();
              onChange(digits.slice(0, i - 1));
            }
          }}
          className="h-12 w-10 rounded-xl border border-line bg-card text-center text-lg font-semibold text-ink outline-none focus:border-gold sm:w-11"
        />
      ))}
    </div>
  );
}

export { OTP_LENGTH };
