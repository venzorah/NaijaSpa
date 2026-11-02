import { z } from "zod";

/** Public links allow site paths or HTTPS; never executable or protocol-relative URLs. */
export const publicContentUrl = z.string().trim().min(1).max(500).refine(value => {
  if (/[\\\u0000-\u0020]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Use a site path starting with / or an https:// URL.");
