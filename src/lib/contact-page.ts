import { toWhatsAppLink } from "./commercial";
import { SUPPORT_WHATSAPP_DISPLAY, supportWhatsAppHref } from "./support";

const FALLBACK_SUPPORT_EMAIL = "concierge@naijaspa.com";

export const CONTACT_CMS_KEY = "contact";

export const CONTACT_CHANNEL_KINDS = ["email", "whatsapp", "phone", "address", "hours", "link", "text"] as const;
export type ContactChannelKind = (typeof CONTACT_CHANNEL_KINDS)[number];

export type ContactChannel = {
  kind: ContactChannelKind;
  label: string;
  value: string;
  href?: string;
};

export type ContactPageContent = {
  subtitle: string;
  intro: string;
  showForm: boolean;
  formHeading: string;
  channels: ContactChannel[];
};

type StoredContactPage = {
  v: 1;
  subtitle?: string;
  intro?: string;
  showForm?: boolean;
  formHeading?: string;
  channels?: unknown;
};

export function defaultContactChannels(supportEmail = FALLBACK_SUPPORT_EMAIL): ContactChannel[] {
  return [
    { kind: "email", label: "Email", value: supportEmail },
    { kind: "whatsapp", label: "WhatsApp", value: SUPPORT_WHATSAPP_DISPLAY },
    { kind: "phone", label: "Phone", value: "+234 1 555 0100" },
    { kind: "address", label: "Office", value: "Lagos, Nigeria" },
    { kind: "hours", label: "Hours", value: "Daily, 8:00 AM – 10:00 PM WAT" }
  ];
}

export function defaultContactPage(supportEmail = FALLBACK_SUPPORT_EMAIL): ContactPageContent {
  return {
    subtitle: "We’re here 8 AM – 10 PM, every day.",
    intro: "",
    showForm: true,
    formHeading: "Send a message",
    channels: defaultContactChannels(supportEmail)
  };
}

function asKind(value: unknown): ContactChannelKind {
  return CONTACT_CHANNEL_KINDS.includes(value as ContactChannelKind) ? (value as ContactChannelKind) : "text";
}

function parseChannel(raw: unknown): ContactChannel | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const label = typeof row.label === "string" ? row.label.trim() : "";
  const value = typeof row.value === "string" ? row.value.trim() : "";
  if (!label && !value) return null;
  const href = typeof row.href === "string" ? row.href.trim() : "";
  return {
    kind: asKind(row.kind),
    label: label || "Contact",
    value,
    ...(href ? { href } : {})
  };
}

export function parseContactPage(body: string | null | undefined, supportEmail = FALLBACK_SUPPORT_EMAIL): ContactPageContent {
  const fallback = defaultContactPage(supportEmail);
  const raw = body?.trim() || "";
  if (!raw) return fallback;
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as StoredContactPage;
      if (parsed && parsed.v === 1) {
        const channels = Array.isArray(parsed.channels)
          ? parsed.channels.map(parseChannel).filter((row): row is ContactChannel => Boolean(row))
          : fallback.channels;
        return {
          subtitle: typeof parsed.subtitle === "string" ? parsed.subtitle : fallback.subtitle,
          intro: typeof parsed.intro === "string" ? parsed.intro : "",
          showForm: parsed.showForm !== false,
          formHeading: typeof parsed.formHeading === "string" && parsed.formHeading.trim() ? parsed.formHeading : fallback.formHeading,
          channels
        };
      }
    } catch {
      /* treat as intro copy */
    }
  }
  return { ...fallback, intro: raw };
}

export function serializeContactPage(content: ContactPageContent): string {
  const stored: StoredContactPage = {
    v: 1,
    subtitle: content.subtitle,
    intro: content.intro,
    showForm: content.showForm,
    formHeading: content.formHeading,
    channels: content.channels
  };
  return JSON.stringify(stored);
}

export function safeContactHref(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  const lower = value.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) return "";
  if (/^(mailto:|tel:|sms:|https?:\/\/|\/)/i.test(value)) return value;
  return "";
}

export function contactChannelHref(channel: ContactChannel) {
  const custom = channel.href ? safeContactHref(channel.href) : "";
  if (custom) return custom;
  const value = channel.value.trim();
  if (!value) return "";
  if (channel.kind === "email" || value.includes("@")) return `mailto:${value}`;
  if (channel.kind === "whatsapp") {
    return toWhatsAppLink(value) || supportWhatsAppHref("Hello NaijaSpa, I need help.");
  }
  if (channel.kind === "phone") {
    const tel = value.replace(/[^\d+]/g, "");
    return tel ? `tel:${tel}` : "";
  }
  if (channel.kind === "link") return safeContactHref(value);
  return "";
}

export function contactFormEmail(content: ContactPageContent, supportEmail = FALLBACK_SUPPORT_EMAIL) {
  const email = content.channels.find((row) => row.kind === "email" && row.value.includes("@"))?.value.trim();
  return email || supportEmail;
}
