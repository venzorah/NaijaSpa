import { appUrl } from "./payments";

export const MAIL_FROM_ADDRESS = "noreply@naijaspa.ng";
export const MAIL_FROM_NAME = "NaijaSpa";

export function mailFrom() {
  return process.env.MAIL_FROM?.trim() || `${MAIL_FROM_NAME} <${MAIL_FROM_ADDRESS}>`;
}

export function mailReplyTo() {
  return process.env.MAIL_REPLY_TO?.trim() || MAIL_FROM_ADDRESS;
}

export function brandLogoUrl() {
  return `${appUrl()}/brand/logo-horizontal-dark.png`;
}

export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST?.trim() || process.env.RESEND_API_KEY?.trim());
}

export function brandedEmailHtml({
  title,
  preheader,
  intro,
  body,
  code,
  cta
}: {
  title: string;
  preheader?: string;
  intro: string;
  body: string;
  code?: string;
  cta?: { href: string; label: string };
}) {
  const logo = brandLogoUrl();
  const forest = "#064E3B";
  const forestDeep = "#04382b";
  const gold = "#D4AF37";
  const cream = "#f4efe6";
  const codeBlock = code
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${forestDeep}" style="background-color:${forestDeep}!important;margin:24px 0 8px">
        <tr>
          <td align="center" bgcolor="${forestDeep}" style="background-color:${forestDeep}!important;padding:18px 12px">
            <p style="margin:0;text-align:center;letter-spacing:12px;font-size:32px;line-height:1.2;font-weight:700;color:${gold}!important;font-family:ui-monospace,Consolas,monospace">${escapeHtml(code)}</p>
          </td>
        </tr>
      </table>`
    : "";
  const ctaBlock = cta
    ? `<p style="margin:28px 0 8px;text-align:center">
        <a href="${escapeAttr(cta.href)}" style="display:inline-block;background-color:${gold}!important;color:${forest}!important;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:999px">${escapeHtml(cta.label)}</a>
      </p>`
    : "";
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" style="background-color:${forest}!important">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}</title>
  <style type="text/css">
    :root { color-scheme: light only; supported-color-schemes: light; }
    html, body { background-color: ${forest} !important; }
    u + .body { background-color: ${forest} !important; }
    @media (prefers-color-scheme: dark) {
      html, body, .body, .wrap, .card, .pad { background-color: ${forest} !important; }
      h1, p, a { color: ${cream} !important; }
      .gold { color: ${gold} !important; }
    }
  </style>
</head>
<body class="body" bgcolor="${forest}" style="margin:0;padding:0;background-color:${forest}!important;color:${cream};font-family:Georgia,'Times New Roman',serif">
  <span style="display:none;max-height:0;overflow:hidden;color:${forest}">${escapeHtml(preheader || intro)}</span>
  <table class="wrap" role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${forest}" style="background-color:${forest}!important;padding:24px 12px">
    <tr>
      <td class="pad" align="center" bgcolor="${forest}" style="background-color:${forest}!important">
        <table class="card" role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="${forest}" style="max-width:560px;width:100%;background-color:${forest}!important;border:1px solid ${gold}">
          <tr>
            <td align="center" bgcolor="${forestDeep}" style="padding:28px 28px 12px;text-align:center;background-color:${forestDeep}!important">
              <img src="${escapeAttr(logo)}" alt="NaijaSpa" width="220" height="64" style="display:block;margin:0 auto;max-width:220px;height:auto;border:0;outline:none" />
            </td>
          </tr>
          <tr>
            <td bgcolor="${forest}" style="padding:8px 28px 32px;background-color:${forest}!important;color:${cream}">
              <h1 class="gold" style="margin:16px 0 12px;font-size:24px;line-height:1.3;color:${gold}!important">${escapeHtml(title)}</h1>
              <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:${cream}!important">${escapeHtml(intro)}</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:${cream}!important">${escapeHtml(body)}</p>
              ${codeBlock}
              ${ctaBlock}
              ${cta ? `<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${cream}!important;word-break:break-all">${escapeHtml(cta.href)}</p>` : ""}
              <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:${cream}!important">NaijaSpa · Lagos · Abuja · Port Harcourt · Delta · Anambra<br />Sent from ${escapeHtml(MAIL_FROM_ADDRESS)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function welcomeEmail({ name, asVendor }: { name: string; asVendor: boolean }) {
  const first = name.trim().split(/\s+/)[0] || "there";
  if (asVendor) {
    return {
      subject: "Welcome to NaijaSpa — your spa listing",
      html: brandedEmailHtml({
        title: "Welcome, spa partner",
        preheader: "Your NaijaSpa vendor account is ready.",
        intro: `Hello ${first}, thank you for joining NaijaSpa as a spa or therapist.`,
        body: "Complete your studio profile, add services, and submit for approval. Clients book through the app and pay with Paystack. Listings stay hidden until an admin approves them.",
        cta: { href: `${appUrl()}/vendor/onboarding`, label: "Open vendor console" }
      })
    };
  }
  return {
    subject: "Welcome to NaijaSpa",
    html: brandedEmailHtml({
      title: "Welcome to NaijaSpa",
      preheader: "Your account is ready. Book spa treatments across Nigeria.",
      intro: `Hello ${first}, your NaijaSpa client account is ready.`,
      body: "Browse verified spas, save favourites, and book treatments in Lagos, Abuja, Port Harcourt, Delta, and Anambra. Pay securely with Paystack.",
      cta: { href: `${appUrl()}/explore`, label: "Explore spas" }
    })
  };
}

export function passwordResetEmail({ code }: { code: string }) {
  return {
    subject: "Your NaijaSpa password reset code",
    html: brandedEmailHtml({
      title: "Password reset code",
      preheader: "Enter this 6-digit code in the NaijaSpa app. It expires in 15 minutes.",
      intro: "Use this code in the app to set a new password. Do not share it.",
      body: "The code expires in 15 minutes. If you did not ask for a reset, you can ignore this email — your password stays the same.",
      code
    })
  };
}

export function vendorInviteEmail({ businessName, setupUrl }: { businessName: string; setupUrl: string }) {
  return {
    subject: "You're invited to list on NaijaSpa",
    html: brandedEmailHtml({
      title: "Vendor invite",
      preheader: `Set up ${businessName} on NaijaSpa.`,
      intro: `${businessName} has been invited to list on NaijaSpa.`,
      body: "Use the button below to set your password. The invite expires in 7 days. We never send a default password.",
      cta: { href: setupUrl, label: "Activate your account" }
    })
  };
}

export async function sendMail({ to, subject, html, text }: { to: string; subject: string; html: string; text?: string }) {
  const from = mailFrom();
  const host = process.env.SMTP_HOST?.trim();
  if (host) {
    const nodemailer = await import("nodemailer");
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    const user = process.env.SMTP_USER?.trim() || MAIL_FROM_ADDRESS;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure && port === 587,
      auth: { user, pass: process.env.SMTP_PASS || "" },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000
    });
    await transporter.sendMail({ from, to, subject, html, text, replyTo: mailReplyTo() });
    return;
  }
  const resend = process.env.RESEND_API_KEY?.trim();
  if (resend) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, text, reply_to: mailReplyTo() })
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return;
  }
  const preview = `[mail] ${subject} → ${to} (from ${from})`;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${preview}; set SMTP_HOST, SMTP_USER and SMTP_PASS for cPanel`);
  }
  console.info(preview);
}

export function queueMail(task: Promise<unknown>) {
  void task.catch((err) => console.error("[mail]", err));
}

export async function sendWelcomeEmail({ to, name, asVendor }: { to: string; name: string; asVendor: boolean }) {
  const mail = welcomeEmail({ name, asVendor });
  await sendMail({ to, ...mail });
}

export async function sendPasswordResetEmail({ to, code }: { to: string; code: string }) {
  const mail = passwordResetEmail({ code });
  await sendMail({
    to,
    ...mail,
    text: `Your NaijaSpa password reset code is ${code}. Enter it in the app. It expires in 15 minutes.`
  });
}

export async function sendVendorInviteEmail({
  to,
  businessName,
  setupUrl
}: {
  to: string;
  businessName: string;
  setupUrl: string;
}) {
  const mail = vendorInviteEmail({ businessName, setupUrl });
  await sendMail({ to, ...mail });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
