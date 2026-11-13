import { sendMail } from "./mail";
import { isGuestPlaceholderEmail } from "./phone";

export async function deliverBookingOtp(input: { phoneNormalized: string; email?: string | null; code: string }) {
  const email = input.email && !isGuestPlaceholderEmail(input.email) ? input.email : "";
  if (email) {
    await sendMail({
      to: email,
      subject: "Your NaijaSpa booking code",
      html: `<p>Your NaijaSpa code is <strong>${input.code}</strong>. It expires in 15 minutes.</p>`,
      text: `Your NaijaSpa code is ${input.code}. It expires in 15 minutes.`
    });
  }
  const termii = process.env.TERMII_API_KEY?.trim();
  if (termii) {
    const res = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: termii,
        to: input.phoneNormalized,
        from: process.env.TERMII_SENDER_ID?.trim() || "NaijaSpa",
        sms: `NaijaSpa code: ${input.code}. Expires in 15 minutes.`,
        type: "plain",
        channel: "generic"
      })
    });
    if (!res.ok) throw Object.assign(new Error("Could not send the SMS code."), { status: 502 });
    return { channel: email ? "sms+email" : "sms" };
  }
  if (email) return { channel: "email" };
  if (process.env.NODE_ENV !== "production") {
    console.info(`[otp] ${input.phoneNormalized} ${input.code}`);
    return { channel: "log" };
  }
  throw Object.assign(new Error("SMS is not configured. Add an email to receive your code, or set TERMII_API_KEY."), {
    status: 503
  });
}
