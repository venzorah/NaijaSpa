import { describe, expect, it } from "vitest";
import {
  contactChannelHref,
  contactFormEmail,
  parseContactPage,
  serializeContactPage
} from "../src/lib/contact-page";

describe("contact page CMS", () => {
  it("treats legacy plain body as intro and keeps default channels", () => {
    const page = parseContactPage("Maitama, Abuja · concierge@naijaspa.com", "hello@naijaspa.com");
    expect(page.intro).toBe("Maitama, Abuja · concierge@naijaspa.com");
    expect(page.showForm).toBe(true);
    expect(page.channels[0]).toEqual({ kind: "email", label: "Email", value: "hello@naijaspa.com" });
  });

  it("round-trips a full admin edit including hidden form and extra channels", () => {
    const stored = serializeContactPage({
      subtitle: "Concierge desk",
      intro: "Visit us in Maitama.",
      showForm: false,
      formHeading: "Write in",
      channels: [
        { kind: "email", label: "Email", value: "desk@naijaspa.com" },
        { kind: "whatsapp", label: "WhatsApp", value: "08011111111" },
        { kind: "text", label: "Instagram", value: "@naijaspa", href: "https://instagram.com/naijaspa" }
      ]
    });
    const page = parseContactPage(stored);
    expect(page.subtitle).toBe("Concierge desk");
    expect(page.showForm).toBe(false);
    expect(page.channels).toHaveLength(3);
    expect(contactChannelHref(page.channels[0])).toBe("mailto:desk@naijaspa.com");
    expect(contactChannelHref(page.channels[1])).toBe("https://wa.me/2348011111111");
    expect(contactChannelHref(page.channels[2])).toBe("https://instagram.com/naijaspa");
    expect(contactFormEmail(page)).toBe("desk@naijaspa.com");
  });

  it("drops javascript hrefs", () => {
    expect(contactChannelHref({ kind: "link", label: "Bad", value: "x", href: "javascript:alert(1)" })).toBe("");
  });
});
