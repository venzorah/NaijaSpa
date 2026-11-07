export function vendorPublicProfileState(visibility: string, applicationStatus: string) {
  if (applicationStatus === "suspended") return { available: false, message: "Your listing is suspended, so its public profile is unavailable. Contact support to review its status." };
  if (applicationStatus === "rejected") return { available: false, message: "Your application needs changes before your profile can be published. Review your application and contact support if you need help." };
  if (applicationStatus !== "approved") return { available: false, message: "Your public profile will be available after your application is approved and your listing is made public." };
  if (visibility !== "public") return { available: false, message: "Your application is approved, but your listing is hidden. Contact support to make it public." };
  return { available: true, message: "" };
}
