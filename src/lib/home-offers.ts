export function homeOfferExpiry(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" });
}
