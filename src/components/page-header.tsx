"use client";

import { goNavBack } from "@/components/nav-history";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  right,
  hideBack = false,
  backHref
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  hideBack?: boolean;
  backHref?: string;
}) {
  const router = useRouter();

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex min-w-0 w-full flex-1 items-start gap-3">
        {hideBack ? null : (
          <button
            type="button"
            onClick={() => goNavBack(router, backHref || "/")}
            aria-label="Go back"
            className="-ml-1 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink hover:bg-elev"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold leading-snug text-ink sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink2">{subtitle}</p> : null}
        </div>
      </div>
      {right ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{right}</div> : null}
    </div>
  );
}
