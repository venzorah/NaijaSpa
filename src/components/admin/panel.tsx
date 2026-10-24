import { cn } from "@/lib/cn";

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-line bg-card shadow-sm", className)}>
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title ? <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-ink2">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
