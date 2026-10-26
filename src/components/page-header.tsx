"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

function isAuthPath(pathname: string) {
  return /^\/(login|register|forgot|reset)(\/|$)/.test(pathname);
}

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

  function goBack() {
    if (backHref) {
      router.push(backHref);
      return;
    }
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === window.location.origin && isAuthPath(ref.pathname)) {
        router.push("/");
        return;
      }
    } catch {
      /* ignore */
    }
    if (window.history.length <= 1) {
      router.push("/");
      return;
    }
    router.back();
  }

  return (
    <div className="mb-5 flex items-start gap-3">
      {hideBack ? null : (
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="-ml-1 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink hover:bg-elev"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-xl font-semibold leading-snug text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink2">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}
