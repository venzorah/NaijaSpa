import type { ButtonHTMLAttributes } from "react";

export function GoldButton({ children, className = "", tone = "solid", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "solid" | "outline" }) {
  const look = tone === "outline" ? "border border-gold/70 bg-transparent text-goldink hover:bg-gold/10" : "bg-gold text-ongold";
  return <button {...props} className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold disabled:opacity-50 ${look} ${className}`}>{children}</button>;
}
