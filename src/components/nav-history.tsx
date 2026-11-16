"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { currentHref, isAuthNavPath, NAV_STACK_KEY, nextNavStack, popNavStack, sameOriginReferrer } from "@/lib/nav-history";

function readStack(): string[] {
  try {
    const raw = sessionStorage.getItem(NAV_STACK_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((row): row is string => typeof row === "string" && row.startsWith("/")) : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  try {
    sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(stack));
  } catch {
    /* private mode */
  }
}

export function recordNavHref(href: string) {
  writeStack(nextNavStack(readStack(), href));
}

export function goNavBack(
  router: { push: (href: string) => void; back: () => void },
  fallback = "/",
  options?: { forceFallback?: boolean }
) {
  const current = currentHref(window.location.pathname, window.location.search);
  if (options?.forceFallback) {
    writeStack(popNavStack(readStack(), current).stack);
    router.push(fallback);
    return;
  }
  const { previous, stack } = popNavStack(readStack(), current, {
    skipAuth: !isAuthNavPath(window.location.pathname)
  });
  writeStack(stack);
  if (previous) {
    router.push(previous);
    return;
  }
  if (sameOriginReferrer(document.referrer, window.location.origin) && window.history.length > 1) {
    router.back();
    return;
  }
  router.push(fallback);
}

export function NavHistoryTracker() {
  const path = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    recordNavHref(currentHref(path, search.toString()));
  }, [path, search]);
  return null;
}

export function NavBackButton({
  fallback = "/",
  className = "-ml-1 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink hover:bg-elev"
}: {
  fallback?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => goNavBack(router, fallback)} aria-label="Go back" className={className}>
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
