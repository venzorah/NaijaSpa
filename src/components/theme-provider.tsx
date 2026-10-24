"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: "dark",
  toggle: () => {},
  setTheme: () => {}
});

function applyDom(next: Theme) {
  const dark = next === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("naijaspa-theme");
    const next: Theme = saved === "light" ? "light" : "dark";
    setTheme(next);
    applyDom(next);
  }, []);

  const apply = useCallback((next: Theme) => {
    localStorage.setItem("naijaspa-theme", next);
    applyDom(next);
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
