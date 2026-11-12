/** Live treatments that can appear on Explore and provider pages. */
export const LIVE_SERVICE_WHERE = { active: true, deletedAt: null } as const;

/** Approved public listings with at least one live treatment. */
export const PUBLIC_LIVE_VENDOR_WHERE = {
  visibility: "public" as const,
  applicationStatus: "approved" as const,
  services: { some: LIVE_SERVICE_WHERE }
};

export function vendorPublicProfileState(visibility: string, applicationStatus: string, activeServiceCount = 1) {
  if (applicationStatus === "suspended") return { available: false, message: "Your listing is suspended, so its public profile is unavailable. Contact support to review its status." };
  if (applicationStatus === "rejected") return { available: false, message: "Your application needs changes before your profile can be published. Review your application and contact support if you need help." };
  if (applicationStatus !== "approved") return { available: false, message: "Your public profile will be available after your application is approved and your listing is made public." };
  if (visibility !== "public") return { available: false, message: "Your application is approved, but your listing is hidden. Contact support to make it public." };
  if (activeServiceCount < 1) {
    return {
      available: false,
      message: "Add at least one live treatment before customers can find you on Explore or your public profile."
    };
  }
  return { available: true, message: "" };
}
