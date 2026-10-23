import { notFound } from "next/navigation";
import { getDemoCms, usingDemoListings } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!["about", "contact", "privacy", "terms"].includes(slug)) notFound();
  let block: { title: string; body: string } | null = getDemoCms(slug);
  if (!usingDemoListings()) {
    const { prisma } = await import("@/lib/db");
    block = await prisma.cmsBlock.findUnique({ where: { key: slug } });
  }
  if (!block) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-4xl">{block.title}</h1>
      <p className="mt-4 whitespace-pre-wrap text-ink2">{block.body}</p>
    </div>
  );
}
