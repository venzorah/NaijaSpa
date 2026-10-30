import { z } from "zod";

export const NotificationPreferencesSchema = z.object({
  reminders: z.boolean(), offers: z.boolean(), sms: z.boolean(), email: z.boolean()
}).strict();
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = { reminders: true, offers: false, sms: false, email: true };
export function parseNotificationPreferences(raw?: string | null): NotificationPreferences {
  try { return NotificationPreferencesSchema.parse({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw || "{}") }); }
  catch { return { ...DEFAULT_NOTIFICATION_PREFERENCES }; }
}

export function safeNotificationUrl(value: string | null | undefined) {
  return value?.startsWith("/account/") && !value.includes("\\") ? value : "/account/bookings";
}
