"use client";

import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { useRef, useState } from "react";

async function signOut(href: string) {
  const response = await fetch("/api/auth/logout", { method: "POST" });
  if (!response.ok) throw new Error("Could not sign out. Please try again.");
  location.replace(href);
}

export function LogoutButton({
  href = "/",
  variant = "block",
  className
}: {
  href?: string;
  variant?: "block" | "row" | "compact";
  className?: string;
}) {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const styles =
    variant === "block"
      ? "mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-3xl border border-line text-sm font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-300"
      : variant === "row"
        ? "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-ink2 hover:bg-elev hover:text-ink"
        : "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-ink2 hover:bg-elev hover:text-ink";

  return (
    <button type="button" aria-label={busy ? "Signing out" : "Log Out"} aria-busy={busy} disabled={busy} title={error || undefined} className={cn(styles, className)} onClick={async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      setError("");
      try { await signOut(href); } catch {
        setError("Could not sign out. Click to retry.");
        setBusy(false);
        inFlight.current = false;
      }
    }}>
      <LogOut className="h-4 w-4 shrink-0" aria-hidden />
      <span aria-live="polite">{busy ? "Signing out…" : error ? "Retry Log Out" : "Log Out"}</span>
    </button>
  );
}
