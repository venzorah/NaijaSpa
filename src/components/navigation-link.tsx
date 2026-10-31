"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function NavigationProgress() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span role="status" className="pointer-events-none fixed inset-x-0 top-0 z-[150] h-1 animate-pulse bg-gold">
      <span className="sr-only">Opening page…</span>
    </span>
  ) : null;
}

/** Keep standard link behavior, including keyboard and opening a new tab. */
export default function NavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<NavigationProgress /></Link>;
}
