"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  right,
  hideBack = false
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  hideBack?: boolean;
}) {
  const router = useRouter();
  return (
    <div className="mb-5 flex items-start gap-3">
      {hideBack ? null : (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="-ml-1 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink hover:bg-elev"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[30px] font-semibold leading-tight text-ink md:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink2">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}
