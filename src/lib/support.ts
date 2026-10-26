import { toWhatsAppLink } from "./commercial";

export const SUPPORT_WHATSAPP = "+2347039340610";
export const SUPPORT_WHATSAPP_DISPLAY = "+234 703 934 0610";

export function supportWhatsAppHref(prefill?: string) {
  const base = toWhatsAppLink(SUPPORT_WHATSAPP);
  if (!base) return "https://wa.me/2347039340610";
  if (!prefill) return base;
  return `${base}?text=${encodeURIComponent(prefill)}`;
}
