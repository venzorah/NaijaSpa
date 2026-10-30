import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());

async function main() {
  if (!process.argv.includes("--to-google-login")) throw new Error("Explicit recipient selection is required");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ log: [] });
  try {
    const users = await db.user.findMany({ where: { googleId: { not: null }, emailVerifiedAt: { not: null }, status: "active" }, select: { email: true } });
    if (users.length !== 1) throw new Error("Specify a recipient: more than one or no verified Google account exists");
    const { sendMail, brandedEmailHtml } = await import("../src/lib/mail");
    const subject = `NaijaSpa email delivery test ${Date.now()}`;
    await sendMail({ to: users[0].email, subject,
      text: "This is the NaijaSpa test email you requested. SMTP authentication and sending are connected.",
      html: brandedEmailHtml({ title: "Email delivery test", intro: "This is the NaijaSpa test email you requested.", body: "SMTP authentication and sending are connected. You can return to the app to continue testing." }) });
    console.log(JSON.stringify({ check: "email-send", acceptedBySmtp: true, recipient: "your verified Google-login email", subject, inboxConfirmationRequired: true }));
  } finally { await db.$disconnect(); }
}
main().catch((error) => { console.log(JSON.stringify({ check: "email-send", ok: false, code: error.code || error.name })); process.exitCode = 1; });
