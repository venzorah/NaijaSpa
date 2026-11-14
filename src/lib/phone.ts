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

export function normalizeGuestEmail(raw: string) {
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 190) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  if (isGuestPlaceholderEmail(email)) return "";
  return email;
}

export function emailOtpDest(email: string) {
  return `email:${email.trim().toLowerCase()}`;
}

export function guestOtpTarget(input: { phone?: string; email?: string }) {
  const rawPhone = input.phone?.trim() || "";
  const rawEmail = input.email?.trim() || "";
  const phone = rawPhone ? normalizeNgPhone(rawPhone) : "";
  const email = rawEmail ? normalizeGuestEmail(rawEmail) : "";
  if (rawPhone && !phone && !email) {
    throw Object.assign(new Error("Enter a valid Nigerian phone number."), { status: 400 });
  }
  if (rawEmail && !email && !phone) {
    throw Object.assign(new Error("Enter the email used at guest checkout."), { status: 400 });
  }
  if (phone && email) {
    throw Object.assign(new Error("Use either phone or email, not both."), { status: 400 });
  }
  if (email) return { kind: "email" as const, email, dest: emailOtpDest(email) };
  if (phone) return { kind: "phone" as const, phone, dest: phone, rawPhone };
  throw Object.assign(new Error("Enter a phone number or the email used at checkout."), { status: 400 });
}

export function maskEmail(raw: string) {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  const user = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${user.slice(0, 1)}***@${domain}`;
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
