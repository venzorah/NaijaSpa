import { describe, expect, it } from "vitest";
import {
  announcementInboxPath,
  announcementPreview,
  encodeAnnouncementInboxBody,
  isAnnouncementInboxActionUrl,
  parseAnnouncementInboxBody
} from "../src/lib/announcement-inbox";

describe("announcement inbox", () => {
  it("stores the full message and a safe CTA for the reader", () => {
    const encoded = encodeAnnouncementInboxBody("Hello from NaijaSpa.", "Platinum listings now include extra Explore placement.", {
      label: "Open Explore",
      href: "/explore"
    });
    expect(encoded).toContain("Platinum listings");
    expect(parseAnnouncementInboxBody(encoded)).toEqual({
      text: "Hello from NaijaSpa.\n\nPlatinum listings now include extra Explore placement.",
      cta: { label: "Open Explore", href: "/explore" }
    });
  });

  it("drops javascript CTAs and still shows the copy", () => {
    const encoded = encodeAnnouncementInboxBody("Intro", "Body", { label: "Bad", href: "javascript:alert(1)" });
    expect(encoded).toBe("Intro\n\nBody");
    expect(parseAnnouncementInboxBody("Intro\n\nNAIJASPA_CTA:Hack\tjavascript:alert(1)").cta).toBeNull();
  });

  it("routes customer and vendor inboxes and recognises older dashboard links", () => {
    expect(announcementInboxPath("customer", "n1")).toBe("/account/messages/n1");
    expect(announcementInboxPath("vendor_owner", "n1")).toBe("/vendor/messages/n1");
    expect(isAnnouncementInboxActionUrl("/account/messages/n1")).toBe(true);
    expect(isAnnouncementInboxActionUrl("/vendor/dashboard")).toBe(true);
    expect(isAnnouncementInboxActionUrl("/account/bookings/b1")).toBe(false);
  });

  it("previews without the CTA marker", () => {
    const encoded = encodeAnnouncementInboxBody("Short intro.", "More detail.", { label: "Go", href: "/explore" });
    expect(announcementPreview(encoded)).toBe("Short intro. More detail.");
  });
});
