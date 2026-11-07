"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
export type ThemeSaveResult = { deviceSaved: boolean; accountSaved: boolean };
const ThemeCtx = createContext<{ theme: Theme; toggle: () => Promise<ThemeSaveResult>; setTheme: (t: Theme) => Promise<ThemeSaveResult> }>({
  theme: "light",
  toggle: async () => ({ deviceSaved: false, accountSaved: false }),
  setTheme: async () => ({ deviceSaved: false, accountSaved: false })
});

function applyDom(next: Theme) {
  const dark = next === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("naijaspa-theme"); } catch { /* Browser storage can be disabled. */ }
    const next: Theme = saved === "dark" ? "dark" : "light";
    setTheme(next);
    applyDom(next);
  }, []);

  const apply = useCallback(async (next: Theme): Promise<ThemeSaveResult> => {
    applyDom(next);
    let deviceSaved = true, accountSaved = false;
    try { localStorage.setItem("naijaspa-theme", next); } catch { deviceSaved = false; }
    setTheme(next);
    try { accountSaved = (await fetch("/api/account/theme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: next }) })).ok; } catch { /* Return partial-save state. */ }
    return { deviceSaved, accountSaved };
  }, []);

  const toggle = useCallback(() => {
    return apply(theme === "dark" ? "light" : "dark");
  }, [apply, theme]);

  return <ThemeCtx.Provider value={{ theme, toggle, setTheme: apply }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
