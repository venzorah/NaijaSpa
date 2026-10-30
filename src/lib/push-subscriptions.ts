import { ECDH } from "node:crypto";
import { z } from "zod";

export function allowedPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
    return ["fcm.googleapis.com", "updates.push.services.mozilla.com", "push.services.mozilla.com", "web.push.apple.com"].includes(url.hostname)
      || url.hostname.endsWith(".notify.windows.com") || url.hostname.endsWith(".push.apple.com");
  } catch { return false; }
}
const base64url = z.string().regex(/^[a-zA-Z0-9_-]+$/);
export const PushSubscriptionSchema = z.object({
  endpoint: z.string().max(4096).refine(allowedPushEndpoint, "Unsupported browser push service"),
  keys: z.object({
    p256dh: base64url.refine((v) => { try { const bytes = Buffer.from(v, "base64url"); return bytes.length === 65 && bytes[0] === 4 && ECDH.convertKey(bytes, "prime256v1").length === 65; } catch { return false; } }, "Invalid push public key"),
    auth: base64url.refine((v) => Buffer.from(v, "base64url").length === 16, "Invalid push authentication key")
  })
});
