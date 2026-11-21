import { afterEach, describe, expect, it } from "vitest";
import {
  MAIL_FROM_ADDRESS,
  MAIL_REPLY_TO_DEFAULT,
  brandLogoUrl,
  brandedEmailHtml,
  mailFrom,
  mailReplyTo,
  passwordResetEmail,
  vendorInviteEmail,
  welcomeEmail
} from "../src/lib/mail";

const original = {
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  MAIL_FROM: process.env.MAIL_FROM,
  RESEND_REPLY_TO: process.env.RESEND_REPLY_TO,
  MAIL_REPLY_TO: process.env.MAIL_REPLY_TO
};

afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("branded transactional mail", () => {
  it("sends from the notifications subdomain and replies to support", () => {
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.MAIL_FROM;
    delete process.env.RESEND_REPLY_TO;
    delete process.env.MAIL_REPLY_TO;
    expect(MAIL_FROM_ADDRESS).toBe("notification@notifications.naijaspa.com");
    expect(mailFrom()).toContain("notification@notifications.naijaspa.com");
    expect(mailReplyTo()).toBe("support@naijaspa.com");
    expect(MAIL_REPLY_TO_DEFAULT).toBe("support@naijaspa.com");
    const html = brandedEmailHtml({
      title: "Hello",
      intro: "Intro",
      body: "Body"
    });
    expect(html).toContain(brandLogoUrl());
    expect(html).toContain("/brand/logo-horizontal-dark.png");
    expect(html).toContain("alt=\"NaijaSpa\"");
    expect(html).toContain(MAIL_FROM_ADDRESS);
    expect(html).toContain('bgcolor="#064E3B"');
    expect(html).toContain("color-scheme\" content=\"light only");
  });

  it("prefers RESEND_FROM_EMAIL and RESEND_REPLY_TO over MAIL_*", () => {
    process.env.MAIL_FROM = "NaijaSpa <old@naijaspa.ng>";
    process.env.MAIL_REPLY_TO = "old@naijaspa.ng";
    process.env.RESEND_FROM_EMAIL = "NaijaSpa <notification@notifications.naijaspa.com>";
    process.env.RESEND_REPLY_TO = "support@naijaspa.com";
    expect(mailFrom()).toBe("NaijaSpa <notification@notifications.naijaspa.com>");
    expect(mailReplyTo()).toBe("support@naijaspa.com");
  });

  it("builds customer and vendor welcome copy", () => {
    const customer = welcomeEmail({ name: "Ada Lovelace", asVendor: false });
    expect(customer.subject).toMatch(/Welcome to NaijaSpa/);
    expect(customer.html).toContain("Hello Ada");
    expect(customer.html).toContain("/explore");
    const vendor = welcomeEmail({ name: "Luna Spa", asVendor: true });
    expect(vendor.subject).toMatch(/vendor|listing|spa partner/i);
    expect(vendor.html).toContain("/vendor/onboarding");
  });

  it("builds password reset OTP and vendor invite emails", () => {
    const reset = passwordResetEmail({ code: "482913" });
    expect(reset.subject.toLowerCase()).toMatch(/password|code/);
    expect(reset.html).toContain("482913");
    expect(reset.html).not.toContain("/reset?token=");
    expect(reset.html).toContain("/brand/logo-horizontal-dark.png");
    expect(reset.html).toContain('bgcolor="#064E3B"');
    expect(reset.html).toContain('bgcolor="#04382b"');
    const invite = vendorInviteEmail({
      businessName: "Luna Spa",
      setupUrl: "https://naijaspa.ng/invite/tok"
    });
    expect(invite.html).toContain("https://naijaspa.ng/invite/tok");
    expect(invite.html).toContain("Luna Spa");
  });
});
