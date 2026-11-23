import Link from "next/link";

export function ShopEmptyState({
  title,
  body,
  href,
  cta
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="mt-8 rounded-[2rem] border border-dashed border-line bg-card px-6 py-14 text-center">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink2">{body}</p>
      {href && cta ? (
        <Link href={href} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold">
          {cta}
        </Link>
      ) : null}
    </div>
  );
}
