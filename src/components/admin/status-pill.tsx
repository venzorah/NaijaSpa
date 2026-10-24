import { cn } from "@/lib/cn";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "gold";

const TONE: Record<Tone, string> = {
  success: "bg-forest/10 text-forest ring-forest/25",
  warning: "bg-gold/15 text-goldink ring-gold/35",
  danger: "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300",
  info: "bg-elev text-ink ring-line",
  neutral: "bg-elev text-ink2 ring-line",
  gold: "bg-gold/15 text-goldink ring-gold/35"
};

function toneFor(status: string): Tone {
  const s = status.toLowerCase();
  if (["active", "approved", "verified", "success", "completed", "published", "live"].some((x) => s.includes(x))) return "success";
  if (["pending", "review", "awaiting", "draft", "open", "initialized"].some((x) => s.includes(x))) return "warning";
  if (["reject", "suspend", "cancel", "fail", "danger", "flag", "dispute", "deletion"].some((x) => s.includes(x))) return "danger";
  if (["gold", "sponsor", "promo", "member"].some((x) => s.includes(x))) return "gold";
  return "neutral";
}

export function AdminStatusPill({
  status,
  tone,
  className,
  dot = true
}: {
  status: string;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  const t = tone ?? toneFor(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset", TONE[t], className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {status.replace(/_/g, " ")}
    </span>
  );
}
