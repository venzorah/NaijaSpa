"use client";

import { useEffect, useState } from "react";
import Link from "@/components/navigation-link";
import type { TickerItem } from "@/lib/ticker";

function TickerCopy({ item }: { item: TickerItem }) {
  const className = "whitespace-nowrap px-6 text-[12px] font-semibold tracking-wide text-gold";
  if (item.href) {
    return (
      <Link href={item.href} className={`${className} underline-offset-2 hover:underline`}>
        {item.text}
      </Link>
    );
  }
  return <span className={className}>{item.text}</span>;
}

function TickerTrack({ items }: { items: TickerItem[] }) {
  return (
    <div className="flex min-w-full shrink-0 items-center py-1.5">
      {items.map((item) => (
        <span key={item.id} className="flex items-center">
          <TickerCopy item={item} />
          <span className="h-1 w-1 rounded-full bg-gold/80" />
        </span>
      ))}
    </div>
  );
}

export function TopBarTicker({ items }: { items: TickerItem[] }) {
  if (!items.length) return null;
  return (
    <div className="h-8 overflow-hidden border-t border-gold/40 bg-forest" role="region" aria-label="Site updates">
      <div className="sr-only">
        {items.map((item) => (
          <p key={item.id}>{item.text}</p>
        ))}
      </div>
      <div className="naijaspa-ticker flex w-max min-w-full" aria-hidden>
        <TickerTrack items={items} />
        <TickerTrack items={items} />
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
