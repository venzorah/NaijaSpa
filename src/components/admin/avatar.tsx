import { cn } from "@/lib/cn";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function PersonAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-forest font-semibold text-gold ring-1 ring-gold/40",
        size === "lg" ? "h-12 w-12 text-sm" : "h-8 w-8 text-[11px]"
      )}
    >
      {initials(name)}
    </span>
  );
}
