export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "confirmed" || status === "completed" || status === "success" || status === "Successful" || status === "published"
      ? "bg-forest/10 text-forest"
      : status === "cancelled" || status === "refunded" || status === "failed"
        ? "bg-red-500/10 text-red-700 dark:text-red-300"
        : status === "awaiting_payment" || status === "pending"
          ? "bg-gold/15 text-goldink"
          : "bg-elev text-ink2";
  const label = status.replace(/_/g, " ");
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${tone}`}>{label}</span>;
}
