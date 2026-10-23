"use client";

import { useTheme } from "@/components/theme-provider";

export default function Page() {
  const { theme, toggle } = useTheme();
  return (
    <div>
      <h1 className="font-display text-3xl">Vendor settings</h1>
      <button type="button" onClick={toggle} className="mt-6 rounded-full border border-line px-5 py-3">
        {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      </button>
    </div>
  );
}
