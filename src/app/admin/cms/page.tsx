import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CmsConsole } from "@/components/admin/cms-console";
import { CONTACT_CMS_KEY, defaultContactPage, serializeContactPage } from "@/lib/contact-page";
import { DEFAULT_SUPPORT_EMAIL } from "@/lib/platform-settings";

export default async function Page() {
  const { editable } = await requireAdminScreen("cms");
  await prisma.cmsBlock.upsert({
    where: { key: CONTACT_CMS_KEY },
    create: {
      key: CONTACT_CMS_KEY,
      title: "Contact us",
      body: serializeContactPage(defaultContactPage(DEFAULT_SUPPORT_EMAIL)),
      published: true
    },
    update: {}
  });
  const [blocks, faqs] = await Promise.all([
    prisma.cmsBlock.findMany({ orderBy: { title: "asc" } }),
    prisma.faq.findMany({ orderBy: { sortOrder: "asc" } })
  ]);
  return (
    <div>
      <AdminPageHeader screen="cms" />
      <CmsConsole
        editable={editable}
        blocks={blocks.map((b) => ({
          id: b.id,
          key: b.key,
          title: b.title,
          body: b.body,
          metaTitle: b.metaTitle,
          metaDescription: b.metaDescription,
          published: b.published
        }))}
        faqs={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer, published: f.published }))}
      />
    </div>
  );
}
