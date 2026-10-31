"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: "light",
  toggle: () => {},
  setTheme: () => {}
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

  const apply = useCallback((next: Theme) => {
    applyDom(next);
    try { localStorage.setItem("naijaspa-theme", next); } catch { /* Keep the toggle working without persistence. */ }
    fetch("/api/account/theme", { method: "POST", body: JSON.stringify({ theme: next }) }).catch(() => {});
    setTheme(next);
  }, []);

  const toggle = useCallback(() => {
    apply(theme === "dark" ? "light" : "dark");
  }, [apply, theme]);

  return <ThemeCtx.Provider value={{ theme, toggle, setTheme: apply }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
