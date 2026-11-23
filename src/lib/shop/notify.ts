import { prisma } from "@/lib/db";
import { brandedEmailHtml, queueMail, sendMail } from "@/lib/mail";
import { SHOP_PUBLIC_URL } from "@/lib/shop-host";

export async function notifyShopUser(userId: string, title: string, body: string, actionUrl: string) {
  await prisma.notification.create({ data: { userId, title, body, actionUrl } }).catch(() => undefined);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (!user?.email) return;
  const href = actionUrl.startsWith("http") ? actionUrl : `${SHOP_PUBLIC_URL}${actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`}`;
  queueMail(
    sendMail({
      to: user.email,
      subject: title,
      html: brandedEmailHtml({
        title,
        preheader: body,
        intro: `Hello ${user.name.split(" ")[0] || "there"},`,
        body,
        cta: { href, label: "Open Shop" }
      }),
      text: body
    })
  );
}
