import { describe, expect, it } from "vitest";
import {
  MAIL_FROM_ADDRESS,
  brandLogoUrl,
  brandedEmailHtml,
  mailFrom,
  passwordResetEmail,
  vendorInviteEmail,
  welcomeEmail
} from "../src/lib/mail";

describe("branded transactional mail", () => {
  it("sends from noreply@naijaspa.ng and includes the logo", () => {
    expect(MAIL_FROM_ADDRESS).toBe("noreply@naijaspa.ng");
    expect(mailFrom()).toContain("noreply@naijaspa.ng");
    const html = brandedEmailHtml({
      title: "Hello",
      intro: "Intro",
      body: "Body"
    });
    expect(html).toContain(brandLogoUrl());
    expect(html).toContain("/brand/logo-horizontal-dark.png");
    expect(html).toContain("alt=\"NaijaSpa\"");
    expect(html).toContain(MAIL_FROM_ADDRESS);
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
    const invite = vendorInviteEmail({
      businessName: "Luna Spa",
      setupUrl: "https://naijaspa.ng/invite/tok"
    });
    expect(invite.html).toContain("https://naijaspa.ng/invite/tok");
    expect(invite.html).toContain("Luna Spa");
  });
});
