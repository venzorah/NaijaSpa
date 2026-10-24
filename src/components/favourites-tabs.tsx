"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { formatNgn } from "@/lib/money";

export type FavService = {
  id: string;
  href: string;
  name: string;
  subtitle: string;
  image: string;
  priceKobo?: number;
};

export type FavProvider = {
  id: string;
  href: string;
  name: string;
  subtitle: string;
  image: string;
};

export function FavouritesTabs({ services, providers }: { services: FavService[]; providers: FavProvider[] }) {
  const [tab, setTab] = useState<"providers" | "services">(providers.length ? "providers" : "services");
  const empty = tab === "providers" ? providers.length === 0 : services.length === 0;
  return (
    <>
      <div role="tablist" className="inline-flex rounded-full border border-line bg-card p-1">
        {(["providers", "services"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-[40px] rounded-full px-5 text-sm font-semibold capitalize ${
              tab === t ? "bg-gold text-ongold" : "text-ink2"
            }`}
          >
            {t} ({t === "providers" ? providers.length : services.length})
          </button>
        ))}
      </div>
      <div className="mt-5">
        {empty ? (
          <EmptyState
            icon={Heart}
            title="Nothing saved yet"
            text="Tap the heart on any spa or treatment to keep it here."
            actionHref="/explore"
            actionLabel="Start exploring"
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(tab === "providers" ? providers : services).map((item) => {
              const price = "priceKobo" in item ? item.priceKobo : undefined;
              return (
              <li key={item.id}>
                <Link href={item.href} className="block overflow-hidden rounded-3xl border border-line bg-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt="" className="h-40 w-full object-cover" />
                  <div className="p-4">
                    <p className="font-semibold text-ink">{item.name}</p>
                    <p className="text-xs text-ink2">{item.subtitle}</p>
                    {typeof price === "number" ? <p className="mt-2 text-sm font-bold">{formatNgn(price)}</p> : null}
                  </div>
                </Link>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
