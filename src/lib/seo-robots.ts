import type { Metadata } from "next";

/** Keep vendor listing photos out of Google Images; pages can still rank. */
export const VENDOR_IMAGE_ROBOTS_TAG = "noindex, noimageindex, noarchive";

export const vendorListingRobots: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    noimageindex: true,
    "max-image-preview": "none",
    "max-video-preview": -1,
    "max-snippet": -1
  }
};

export function withVendorMediaHeaders(headers: HeadersInit = {}) {
  const next = new Headers(headers);
  next.set("X-Robots-Tag", VENDOR_IMAGE_ROBOTS_TAG);
  return next;
}
