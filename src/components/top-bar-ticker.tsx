"use client";

import { useEffect, useState } from "react";
import { AppLinkTab } from "@/components/app-link-tab";
import type { TickerItem } from "@/lib/ticker";

function TickerCopy({ item }: { item: TickerItem }) {
  if (item.href) {
    return <AppLinkTab href={item.href} label={item.text} variant="ticker" />;
  }
  return <span className="whitespace-nowrap px-6 text-[12px] font-semibold tracking-wide text-gold">{item.text}</span>;
}

function TickerTrack({ items, hidden }: { items: TickerItem[]; hidden?: boolean }) {
  return (
    <div className="flex min-w-full shrink-0 items-center gap-3 py-1.5" {...(hidden ? { "aria-hidden": true, inert: true } : {})}>
      {items.map((item) => (
        <span key={item.id} className="flex items-center gap-3">
          <TickerCopy item={item} />
          <span className="h-1 w-1 shrink-0 rounded-full bg-gold/80" aria-hidden />
        </span>
      ))}
    </div>
  );
}

export function TopBarTicker({ items }: { items: TickerItem[] }) {
  if (!items.length) return null;
  return (
    <div className="flex h-10 items-center overflow-hidden border-t border-gold/40 bg-forest" role="region" aria-label="Site updates">
      <div className="naijaspa-ticker flex w-max min-w-full">
        <TickerTrack items={items} />
        <TickerTrack items={items} hidden />
      </div>
    </div>
  );
}

export function useTopBarTicker(initial: TickerItem[] = []) {
  const [items, setItems] = useState<TickerItem[]>(initial);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ticker")
      .then((res) => res.json())
      .then((json: { items?: TickerItem[] }) => {
        if (!cancelled && Array.isArray(json.items)) setItems(json.items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return items;
}
