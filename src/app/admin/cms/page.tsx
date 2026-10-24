import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CmsConsole } from "@/components/admin/cms-console";

export default async function Page() {
  const { editable } = await requireAdminScreen("cms");
  const [blocks, faqs] = await Promise.all([
    prisma.cmsBlock.findMany({ orderBy: { title: "asc" } }),
    prisma.faq.findMany({ orderBy: { sortOrder: "asc" } })
  ]);
  return (
    <div>
      <AdminPageHeader screen="cms" />
      <CmsConsole
        editable={editable}
        blocks={blocks.map((b) => ({ id: b.id, key: b.key, title: b.title, body: b.body, published: b.published }))}
        faqs={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer, published: f.published }))}
      />
    </div>
  );
}
