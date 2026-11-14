import { sendGuestBookingOtpEmail } from "./mail";
import { isGuestPlaceholderEmail } from "./phone";

function realEmail(email?: string | null) {
  const value = email?.trim().toLowerCase() || "";
  if (!value || isGuestPlaceholderEmail(value)) return "";
  return value;
}

export async function deliverBookingOtp(input: {
  phoneNormalized?: string;
  email?: string | null;
  code: string;
  via?: "sms" | "email" | "auto";
}) {
  const email = realEmail(input.email);
  const via = input.via || "auto";
  const wantEmail = via === "email" || (via === "auto" && Boolean(email));
  const wantSms = via === "sms" || (via === "auto" && Boolean(input.phoneNormalized));
  let emailed = false;

  if (wantEmail && email) {
    try {
      await sendGuestBookingOtpEmail({ to: email, code: input.code });
      emailed = true;
      if (via === "email" || !wantSms) return { channel: "email" as const };
    } catch (err) {
      if (via === "email") throw err;
      console.error("[otp] email delivery failed", err);
    }
  } else if (via === "email") {
    throw Object.assign(new Error("Add a real email at checkout to receive a code."), { status: 400 });
  }

  const termii = process.env.TERMII_API_KEY?.trim();
  if (wantSms && termii && input.phoneNormalized) {
    const baseUrl = new URL(process.env.TERMII_BASE_URL?.trim() || "https://api.ng.termii.com");
    if (baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password) {
      throw Object.assign(new Error("Termii requires an HTTPS API base URL without credentials."), { status: 503 });
    }
    const channel = process.env.TERMII_CHANNEL?.trim() || "generic";
    if (channel !== "generic" && channel !== "dnd") {
      throw Object.assign(new Error("TERMII_CHANNEL must be generic or dnd."), { status: 503 });
    }
    const res = await fetch(new URL("/api/sms/send", baseUrl).href, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: termii,
        to: input.phoneNormalized,
        from: process.env.TERMII_SENDER_ID?.trim() || "NaijaSpa",
        sms: `NaijaSpa code: ${input.code}. Expires in 15 minutes.`,
        type: "plain",
        channel
      })
    });
    if (!res.ok) throw Object.assign(new Error("Could not send the SMS code."), { status: 502 });
    return { channel: emailed ? "sms+email" : "sms" };
  }
  if (emailed) return { channel: "email" as const };
  if (process.env.NODE_ENV !== "production") {
    console.info(`[otp] ${input.phoneNormalized || email} ${input.code}`);
    return { channel: "log" as const };
  }
  throw Object.assign(
    new Error("Could not send a verification code. Try email if you added one at checkout, or set TERMII_API_KEY."),
    { status: 503 }
  );
}
