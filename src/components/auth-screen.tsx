"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Building2, Eye, EyeOff, Moon, Sun, User } from "lucide-react";
import { BrandLogo } from "@/components/shell";
import { useTheme } from "@/components/theme-provider";

export const authFieldClass =
  "min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-ink outline-none placeholder:text-ink2 focus:border-forest";

export const authCtaClass =
  "min-h-12 w-full rounded-full bg-forest text-base font-bold text-white shadow-[0_8px_24px_rgba(6,78,59,0.22)] disabled:opacity-60 dark:bg-leaf dark:text-forest dark:shadow-[0_8px_24px_rgba(95,211,165,0.2)]";

const selectedTab =
  "bg-forest text-white shadow-sm dark:bg-leaf dark:text-forest";

export function AuthScreen({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-semibold text-ink2">
          <span aria-hidden className="text-lg">
            ←
          </span>
          NaijaSpa home
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-elev"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
      <div className="mt-1 flex justify-center">
        <Link href="/" aria-label="NaijaSpa home">
          <BrandLogo className="h-10 w-auto object-contain" />
        </Link>
      </div>
      {children}
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h1 className="mt-6 text-center font-display text-xl font-semibold leading-snug text-ink">{title}</h1>
      <p className="mt-2 text-center text-sm text-ink2">{subtitle}</p>
    </>
  );
}

export function RoleSwitch({
  asVendor,
  onChange,
  labels = { client: "I'm a Client", vendor: "SPA Therapist" }
}: {
  asVendor: boolean;
  onChange: (vendor: boolean) => void;
  labels?: { client: string; vendor: string };
}) {
  return (
    <div role="tablist" aria-label="Account type" className="mt-7 grid grid-cols-2 rounded-full bg-elev p-1">
      <button
        type="button"
        role="tab"
        aria-selected={!asVendor}
        onClick={() => onChange(false)}
        className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-bold transition ${
          !asVendor ? selectedTab : "text-ink2"
        }`}
      >
        <User className="h-4 w-4" aria-hidden />
        {labels.client}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={asVendor}
        onClick={() => onChange(true)}
        className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-bold transition ${
          asVendor ? selectedTab : "text-ink2"
        }`}
      >
        <Building2 className="h-4 w-4" aria-hidden />
        {labels.vendor}
      </button>
    </div>
  );
}

export function AuthHint({ children }: { children: ReactNode }) {
  return <p className="mt-5 text-[13px] leading-relaxed text-ink2">✨ {children}</p>;
}

export function AuthLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
      {children}
    </label>
  );
}

export function AuthPassword({
  name = "password",
  placeholder = "Min. 10 characters",
  autoComplete = "new-password",
  minLength = 10
}: {
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={name}
        name={name}
        type={show ? "text" : "password"}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${authFieldClass} pr-12`}
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink2"
        onClick={() => setShow((v) => !v)}
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}
