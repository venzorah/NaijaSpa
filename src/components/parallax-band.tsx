import Link from "next/link";

export function ParallaxBand({
  image,
  kicker,
  title,
  body,
  href,
  cta
}: {
  image: string;
  kicker: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <section className="relative isolate my-14 h-[22rem] overflow-hidden md:h-[28rem]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#06140f]/60" />
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 py-14 text-white lg:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">{kicker}</p>
        <h2 className="mt-2 max-w-2xl font-display text-lg font-semibold leading-snug">{title}</h2>
        <p className="mt-3 max-w-lg text-sm text-white/80 md:text-base">{body}</p>
        <Link href={href} className="mt-6 inline-flex w-fit min-h-11 items-center rounded-full bg-gold px-6 text-sm font-bold text-ongold">
          {cta}
        </Link>
      </div>
    </section>
  );
}
