import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "../src/lib/rbac";
import {
  isSendableEmail,
  rolesForAudience,
  wantsAnnouncementEmail
} from "../src/lib/announcements";
import { visibleAdminScreens } from "../src/lib/admin";
import { announcementEmail } from "../src/lib/mail";

const mock = vi.hoisted(() => ({
  role: "super_admin" as string | null,
  findMany: vi.fn(),
  count: vi.fn(),
  findUnique: vi.fn(),
  createMany: vi.fn(),
  setConfig: vi.fn(),
  sendMail: vi.fn(),
  audit: vi.fn()
}));

vi.mock("../src/lib/auth", () => ({
  getSession: async () => (mock.role ? { id: "admin", role: mock.role } : null),
  requireUser: (user: unknown) => {
    if (!user) {
      const err = new Error("Unauthorized");
      (err as Error & { status: number }).status = 401;
      throw err;
    }
    return user;
  }
}));
vi.mock("../src/lib/db", () => ({
  prisma: {
    user: { findMany: mock.findMany, count: mock.count },
    systemConfig: { findUnique: mock.findUnique },
    notification: { createMany: mock.createMany }
  },
  setConfig: mock.setConfig
}));
vi.mock("../src/lib/mail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/mail")>();
  return {
    ...actual,
    mailConfigured: () => true,
    sendMail: mock.sendMail
  };
});
vi.mock("../src/lib/audit", () => ({ audit: mock.audit }));

import { GET, POST } from "../src/app/api/admin/announcements/route";

const payload = {
  audience: "customers",
  subject: "NaijaSpa update",
  title: "New cities this week",
  intro: "A short note from the team.",
  body: "We now list therapists in more neighbourhoods. Open Explore to see who is nearby.",
  ctaLabel: "Explore",
  ctaHref: "/explore",
  inApp: true
};

beforeEach(() => {
  vi.clearAllMocks();
  mock.role = "super_admin";
  mock.count.mockResolvedValue(2);
  mock.findUnique.mockResolvedValue(null);
  mock.findMany.mockResolvedValue([
    { id: "c1", email: "a@example.com", name: "Ada", role: ROLES.CUSTOMER, notificationPreferencesJson: "{}" },
    { id: "c2", email: "deleted-x@redacted.naijaspa", name: "Gone", role: ROLES.CUSTOMER, notificationPreferencesJson: "{}" }
  ]);
  mock.sendMail.mockResolvedValue(undefined);
  mock.setConfig.mockResolvedValue(undefined);
  mock.createMany.mockResolvedValue({ count: 1 });
});

describe("admin announcement emails", () => {
  it("maps audiences to customer or vendor roles only", () => {
    expect(rolesForAudience("customers")).toEqual([ROLES.CUSTOMER]);
    expect(rolesForAudience("vendors")).toEqual([ROLES.VENDOR_OWNER, ROLES.VENDOR_STAFF]);
    expect(rolesForAudience("all")).not.toContain(ROLES.SUPER_ADMIN);
  });

  it("skips deleted redacted addresses and opted-out inboxes", () => {
    expect(isSendableEmail("hello@naijaspa.ng")).toBe(true);
    expect(isSendableEmail("deleted-abc@redacted.naijaspa")).toBe(false);
    expect(wantsAnnouncementEmail(JSON.stringify({ email: false }))).toBe(false);
    expect(wantsAnnouncementEmail("{}")).toBe(true);
  });

  it("escapes announcement copy in the branded template", () => {
    const mail = announcementEmail({
      title: "Hi <script>",
      intro: "Hello",
      body: "Line one\nLine two"
    });
    expect(mail.html).toContain("Hi &lt;script&gt;");
    expect(mail.html).toContain("Line one<br />Line two");
    expect(mail.html).not.toContain("<script>");
  });

  it("exposes the console to content staff and hides it from analysts", () => {
    expect(visibleAdminScreens("content_manager").some((s) => s.id === "announcements")).toBe(true);
    expect(visibleAdminScreens("analyst").some((s) => s.id === "announcements")).toBe(false);
  });

  it("blocks customers from blasting the list", async () => {
    mock.role = "customer";
    expect((await GET()).status).toBe(403);
    expect(
      (
        await POST(
          new Request("http://localhost/api/admin/announcements", {
            method: "POST",
            body: JSON.stringify(payload)
          })
        )
      ).status
    ).toBe(403);
    expect(mock.sendMail).not.toHaveBeenCalled();
  });

  it("sends to eligible customers and records the blast", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify(payload)
      })
    );
    expect(res.status).toBe(200);
    expect(mock.sendMail).toHaveBeenCalledTimes(1);
    expect(mock.sendMail.mock.calls[0][0].to).toBe("a@example.com");
    expect(mock.createMany).toHaveBeenCalled();
    expect(mock.audit).toHaveBeenCalled();
    expect(mock.setConfig).toHaveBeenCalled();
  });

  it("rejects javascript links on the call-to-action", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ ...payload, ctaHref: "javascript:alert(1)" })
      })
    );
    expect(res.status).toBe(400);
    expect(mock.sendMail).not.toHaveBeenCalled();
  });
});
