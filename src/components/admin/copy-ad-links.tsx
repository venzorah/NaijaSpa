"use client";

import { useState } from "react";
import { adminBtnOutline } from "@/components/admin/form-row";
import { adLandingPath } from "@/lib/listing-traffic";

const NETWORKS = [
  { source: "facebook", label: "Facebook" },
  { source: "instagram", label: "Instagram" },
  { source: "google", label: "Google" },
  { source: "tiktok", label: "TikTok" }
] as const;

export function CopyAdLinks({
  slug,
  kind,
  campaign
}: {
  slug: string;
  kind: "vendor" | "service";
  campaign?: string;
}) {
  const [copied, setCopied] = useState("");
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  async function copy(source: string) {
    const path = adLandingPath(kind, slug, { source, medium: "paid", campaign: campaign || slug });
    const url = `${origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(source);
    } catch {
      setCopied("");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {NETWORKS.map((network) => (
        <button
          key={network.source}
          type="button"
          className={adminBtnOutline}
          onClick={() => void copy(network.source)}
        >
          {copied === network.source ? "Copied" : network.label}
        </button>
      ))}
    </div>
  );
}
