export function normalizeNgPhone(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  let intl = digits;
  if (digits.startsWith("0") && digits.length === 11) intl = `234${digits.slice(1)}`;
  else if (digits.length === 10) intl = `234${digits}`;
  else if (digits.startsWith("234") && digits.length === 13) intl = digits;
  if (!/^234[789]\d{9}$/.test(intl)) return "";
  return intl;
}

export function displayNgPhone(normalized: string) {
  if (!normalized.startsWith("234") || normalized.length !== 13) return normalized;
  return `0${normalized.slice(3)}`;
}

export function maskNgPhone(raw: string) {
  const normalized = normalizeNgPhone(raw);
  if (!normalized) return raw.trim();
  const local = displayNgPhone(normalized);
  return `${local.slice(0, 4)} *** **${local.slice(-2)}`;
}

export function guestPlaceholderEmail(phoneNormalized: string) {
  return `guest.${phoneNormalized}@guest.naijaspa.local`;
}

export function isGuestPlaceholderEmail(email: string) {
  return email.endsWith("@guest.naijaspa.local");
}

export function paystackEmailFor(email: string) {
  if (!isGuestPlaceholderEmail(email)) return email;
  return email.replace("@guest.naijaspa.local", "@naijaspa.com");
}

export function bookingReference(bookingId: string) {
  return `NS-${bookingId.slice(-8).toUpperCase()}`;
}

export function isGuestAccountKind(kind: string | null | undefined) {
  return kind === "guest";
}
