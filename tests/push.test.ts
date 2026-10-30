import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createECDH, randomBytes } from "node:crypto";
const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  user: { findUnique: vi.fn() },
  pushSubscription: { findMany: vi.fn(), deleteMany: vi.fn() },
  notification: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() }
}));
vi.mock("../src/lib/db", () => ({ prisma: mocks }));
vi.mock("web-push", () => ({ default: { sendNotification: mocks.send } }));
import { sendPushToUser, dispatchPendingPush } from "../src/lib/push";
import { allowedPushEndpoint, PushSubscriptionSchema } from "../src/lib/push-subscriptions";
import { parseNotificationPreferences, safeNotificationUrl } from "../src/lib/notification-preferences";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VAPID_PUBLIC_KEY", "public"); vi.stubEnv("VAPID_PRIVATE_KEY", "private"); vi.stubEnv("VAPID_SUBJECT", "mailto:test@example.com");
  mocks.user.findUnique.mockResolvedValue({ status: "active", notificationPreferencesJson: "{}" });
  mocks.pushSubscription.findMany.mockResolvedValue([{ id: "sub", endpoint: "https://updates.push.services.mozilla.com/wpush/v2/test", p256dh: "key", auth: "auth" }]);
  mocks.send.mockResolvedValue({ statusCode: 201 });
});
afterEach(() => vi.unstubAllEnvs());
const payload = { title: "Update", body: "Test", url: "/account/bookings", tag: "test" };
describe("push subscriptions and delivery", () => {
  it.each(["http://fcm.googleapis.com/push", "https://localhost/push", "https://fcm.googleapis.com.evil.test/push", "https://user:pass@fcm.googleapis.com/push", "https://fcm.googleapis.com:444/push"])("rejects unsafe endpoint %s", (endpoint) => expect(allowedPushEndpoint(endpoint)).toBe(false));
  it("validates actual P-256 browser keys", () => {
    const key = createECDH("prime256v1"); key.generateKeys();
    const input = { endpoint: "https://fcm.googleapis.com/push/test", keys: { p256dh: key.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };
    expect(PushSubscriptionSchema.safeParse(input).success).toBe(true);
    expect(PushSubscriptionSchema.safeParse({ ...input, keys: { ...input.keys, p256dh: Buffer.alloc(65).toString("base64url") } }).success).toBe(false);
  });
  it("preserves defaults when saved preferences are malformed", () => {
    expect(parseNotificationPreferences("invalid").reminders).toBe(true);
    expect(parseNotificationPreferences('{"reminders":false}').reminders).toBe(false);
    expect(safeNotificationUrl("https://evil.test")).toBe("/account/bookings");
  });
  it("honours reminder opt-out without contacting a push service", async () => {
    mocks.user.findUnique.mockResolvedValue({ status: "active", notificationPreferencesJson: '{"reminders":false}' });
    expect((await sendPushToUser("user", payload)).skipped).toBe(true);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("allows an explicit self-test with reminders disabled", async () => {
    mocks.user.findUnique.mockResolvedValue({ status: "active", notificationPreferencesJson: '{"reminders":false}' });
    expect((await sendPushToUser("user", payload, true)).sent).toBe(1);
  });
  it("removes expired subscriptions only for the recipient", async () => {
    mocks.send.mockRejectedValue({ statusCode: 410 });
    expect((await sendPushToUser("user", payload)).sent).toBe(0);
    expect(mocks.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { id: "sub", userId: "user" } });
  });
  it("retries transient failures without deleting subscriptions", async () => {
    mocks.send.mockRejectedValue({ statusCode: 503 });
    expect((await sendPushToUser("user", payload)).failed).toBe(1);
    expect(mocks.pushSubscription.deleteMany).not.toHaveBeenCalled();
  });
  it("does not send a queue entry claimed by another worker", async () => {
    mocks.notification.findMany.mockResolvedValue([{ id: "n", pushStatus: "pending", pushAttempts: 0, pushClaimedAt: null }]);
    mocks.notification.updateMany.mockResolvedValue({ count: 0 });
    expect((await dispatchPendingPush()).processed).toBe(0);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
