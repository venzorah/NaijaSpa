"use client";

import Link from "next/link";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff, Lock, Moon, Sparkles, Store, Sun, User } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export const authFieldClass =
  "min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-ink outline-none placeholder:text-ink2 focus:border-forest";

export const authCtaClass =
  "min-h-12 w-full rounded-full bg-forest text-base font-bold text-white shadow-[0_8px_24px_rgba(6,78,59,0.22)] disabled:opacity-60 dark:bg-leaf dark:text-forest dark:shadow-[0_8px_24px_rgba(95,211,165,0.2)]";

export const authGoldCtaClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gold text-base font-bold text-ongold shadow-[0_8px_24px_rgba(212,175,55,0.35)] disabled:opacity-60";

export function AuthScreen({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden px-5 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-semibold text-ink">
          <span aria-hidden className="text-lg text-ink2">
            ←
          </span>
          NaijaSpa Home
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
      <link rel="preload" as="image" href="/brand/auth-hero.webp" type="image/webp" />
      <Link href="/" aria-label="NaijaSpa home" className="relative z-10 mx-auto mt-1 block w-[88%] max-w-[21.5rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/auth-hero.webp"
          alt="NaijaSpa — Find, book and grow wellness and beauty services"
          width={880}
          height={294}
          fetchPriority="high"
          decoding="async"
          className="h-auto w-full object-contain object-center"
        />
        <span className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-bg to-transparent" aria-hidden />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-bg" aria-hidden />
        <span className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-bg to-transparent" aria-hidden />
        <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg to-transparent" aria-hidden />
      </Link>
      <div className="relative z-10 -mt-5 flex-1">{children}</div>
      <div className="pointer-events-none relative -mx-5 mt-6 h-[4.5rem] shrink-0" aria-hidden>
        <svg viewBox="0 0 400 72" className="h-full w-full" preserveAspectRatio="none">
          <path d="M0 28C70 8 130 48 200 28C270 8 330 44 400 22V72H0Z" fill="#064E3B" />
          <path d="M0 22C70 4 130 42 200 22C270 4 330 38 400 16" fill="none" stroke="#D4AF37" strokeWidth="5" />
        </svg>
      </div>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h1 className="mt-5 text-center font-display text-[2rem] font-semibold leading-tight text-ink">{title}</h1>
      <p className="mt-2 text-center text-sm leading-relaxed text-ink2">{subtitle}</p>
      <span className="mx-auto mt-3 block h-1 w-12 rounded-full bg-gold" aria-hidden />
    </>
  );
}

export function AccountTypeCards({ asVendor, onChange }: { asVendor: boolean; onChange: (vendor: boolean) => void }) {
  return (
    <div role="tablist" aria-label="Account type" className="mt-6 grid grid-cols-2 gap-2.5">
      <AccountTypeCard
        selected={!asVendor}
        onClick={() => onChange(false)}
        icon={User}
        title="I'm a Customer"
        subtitle="Book & enjoy services"
      />
      <AccountTypeCard
        selected={asVendor}
        onClick={() => onChange(true)}
        icon={Store}
        title="I'm a Service Provider"
        subtitle="List services & grow"
        tone="forest"
      />
    </div>
  );
}

function AccountTypeCard({
  selected,
  onClick,
  icon: Icon,
  title,
  subtitle,
  tone = "gold"
}: {
  selected: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tone?: "gold" | "forest";
}) {
  const selectedClass =
    tone === "forest"
      ? "bg-forest text-white shadow-[0_8px_20px_rgba(6,78,59,0.28)]"
      : "bg-gold text-ongold shadow-[0_8px_20px_rgba(212,175,55,0.28)]";
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`flex min-h-[4.75rem] flex-col items-start rounded-[1.35rem] px-2.5 py-3 text-left transition sm:px-3 ${
        selected ? selectedClass : "border border-line bg-card text-ink"
      }`}
    >
      <span
        className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-full ${
          selected ? "bg-white/20" : "bg-forest/10 text-forest"
        }`}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="whitespace-nowrap text-[12px] font-bold leading-none tracking-tight sm:text-[13px]">{title}</span>
      <span className={`mt-0.5 text-[11px] leading-snug ${selected ? (tone === "forest" ? "text-white/80" : "text-ongold/80") : "text-ink2"}`}>
        {subtitle}
      </span>
    </button>
  );
}

export function AuthHint({ children, icon: Icon = Sparkles }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-gold/40 bg-[#FBF6E8] px-3.5 py-3.5 dark:bg-gold/10">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/50 bg-gold/15 text-goldink">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="pt-0.5 text-[13px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}

export function AuthLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
      {children}
    </label>
  );
}

export function AuthTextField({
  label,
  icon: Icon,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: LucideIcon }) {
  const id = props.id || props.name;
  return (
    <div>
      <AuthLabel htmlFor={id}>{label}</AuthLabel>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink2" aria-hidden />
        ) : null}
        <input {...props} id={id} className={`${authFieldClass} ${Icon ? "pl-10 text-sm placeholder:text-sm" : ""} ${className}`} />
      </div>
    </div>
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
      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink2" aria-hidden />
      <input
        id={name}
        name={name}
        type={show ? "text" : "password"}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${authFieldClass} pl-11 pr-12 text-sm placeholder:text-sm`}
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

export function AuthOrDivider() {
  return (
    <div className="mt-6 flex items-center gap-3" role="separator" aria-label="or">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink2">OR</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
