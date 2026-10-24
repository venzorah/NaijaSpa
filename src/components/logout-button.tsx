"use client";

import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button
      type="button"
      className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-3xl border border-line text-sm font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-300"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        location.href = "/";
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden /> Sign out
    </button>
  );
}
