"use client";

import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";

async function signOut(href: string) {
  await fetch("/api/auth/logout", { method: "POST" });
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
  const styles =
    variant === "block"
      ? "mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-3xl border border-line text-sm font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-300"
      : variant === "row"
        ? "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-ink2 hover:bg-elev hover:text-ink"
        : "inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-ink2 hover:bg-elev hover:text-ink";

  return (
    <button type="button" aria-label="Log out" className={cn(styles, className)} onClick={() => signOut(href)}>
      <LogOut className="h-4 w-4 shrink-0" aria-hidden />
      {variant === "compact" ? <span className="hidden sm:inline">Log out</span> : "Log out"}
    </button>
  );
}
