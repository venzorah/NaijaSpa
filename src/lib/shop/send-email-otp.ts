import { issueEmailVerifyOtp } from "@/lib/email-otp";
import { sendEmailVerifyOtp } from "@/lib/mail";

export async function queueShopEmailOtp(userId: string, email: string) {
  try {
    const challenge = await issueEmailVerifyOtp(userId);
    if (challenge && "code" in challenge && typeof challenge.code === "string") {
      await sendEmailVerifyOtp({ to: email, code: challenge.code });
    }
  } catch (err) {
    console.error("[mail] shop email verification failed", err);
  }
}
