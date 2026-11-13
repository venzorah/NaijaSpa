"use client";

import { useEffect } from "react";

export function ListingViewBeacon({ vendorId, serviceId }: { vendorId: string; serviceId?: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = new URLSearchParams(window.location.search);
    if (search.get("from") === "admin") return;
    const key = `ns-view:${vendorId}:${serviceId || "vendor"}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode still sends the view */
    }
    void fetch("/api/public/listing-views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        vendorId,
        serviceId,
        path: window.location.pathname,
        referrer: document.referrer || "",
        utmSource: search.get("utm_source") || undefined,
        utmMedium: search.get("utm_medium") || undefined,
        utmCampaign: search.get("utm_campaign") || undefined,
        utmContent: search.get("utm_content") || undefined,
        utmTerm: search.get("utm_term") || undefined,
        src: search.get("src") || undefined
      }),
      keepalive: true
    }).catch(() => {});
  }, [vendorId, serviceId]);
  return null;
}
