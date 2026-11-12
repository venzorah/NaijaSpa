export const VERIFICATION_DOC_KINDS = ["id", "business_registration", "license"] as const;
export type VerificationDocKind = (typeof VERIFICATION_DOC_KINDS)[number];

export const VERIFICATION_DOC_OPTIONS: { id: VerificationDocKind; label: string; hint: string }[] = [
  { id: "id", label: "Government ID", hint: "NIN slip, national ID, international passport or driver’s licence." },
  { id: "business_registration", label: "Business registration", hint: "CAC certificate or business-name registration." },
  { id: "license", label: "Practice licence", hint: "Spa, therapy or professional licence, if you have one." }
];

export const MAX_VERIFICATION_DOC_BYTES = 2 * 1024 * 1024;

export function verificationDocLabel(kind: string) {
  return VERIFICATION_DOC_OPTIONS.find((item) => item.id === kind)?.label ?? kind;
}

export function isVerificationDocKind(value: string): value is VerificationDocKind {
  return (VERIFICATION_DOC_KINDS as readonly string[]).includes(value);
}
