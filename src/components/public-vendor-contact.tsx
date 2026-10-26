"use client";

import { Instagram, Mail, MessageCircle, Phone } from "lucide-react";

export type PublicVendorContactFields = {
  publicPhone?: string | null;
  publicWhatsapp?: string | null;
  publicEmail?: string | null;
  publicInstagram?: string | null;
};

export function hasPublicVendorContact(vendor: PublicVendorContactFields) {
  return Boolean(vendor.publicPhone || vendor.publicWhatsapp || vendor.publicEmail || vendor.publicInstagram);
}

export function PublicVendorContact({
  vendor,
  variant = "buttons"
}: {
  vendor: PublicVendorContactFields;
  variant?: "buttons" | "inline" | "icons";
}) {
  if (!hasPublicVendorContact(vendor)) return null;
  const items = [
    vendor.publicPhone
      ? { href: `tel:${vendor.publicPhone.replace(/\s/g, "")}`, label: "Call", Icon: Phone }
      : null,
    vendor.publicWhatsapp ? { href: vendor.publicWhatsapp, label: "WhatsApp", Icon: MessageCircle } : null,
    vendor.publicEmail ? { href: `mailto:${vendor.publicEmail}`, label: "Email", Icon: Mail } : null,
    vendor.publicInstagram ? { href: vendor.publicInstagram, label: "Instagram", Icon: Instagram } : null
  ].filter(Boolean) as Array<{ href: string; label: string; Icon: typeof Phone }>;

  if (variant === "inline") {
    return (
      <span className="text-ink2">
        {items.map((item) => (
          <span key={item.label}>
            {" · "}
            <a className="text-leaf" href={item.href} target={item.label === "Instagram" ? "_blank" : undefined} rel="noreferrer">
              {item.label}
            </a>
          </span>
        ))}
      </span>
    );
  }

  if (variant === "icons") {
    return (
      <p className="mt-2 flex flex-wrap items-center gap-2">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href}
            aria-label={item.label}
            target={item.label === "Instagram" ? "_blank" : undefined}
            rel="noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-elev text-leaf"
            onClick={(e) => e.stopPropagation()}
          >
            <item.Icon className="h-4 w-4" aria-hidden />
          </a>
        ))}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target={item.label === "Instagram" ? "_blank" : undefined}
          rel="noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-card text-sm font-semibold text-ink hover:bg-elev"
        >
          <item.Icon className="h-4 w-4 text-leaf" aria-hidden /> {item.label}
        </a>
      ))}
    </div>
  );
}
