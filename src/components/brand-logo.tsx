export function BrandLogo({
  className = "h-14 w-auto max-w-[min(14.5rem,68vw)] shrink-0 object-contain object-left sm:h-16 sm:max-w-[18rem]",
  forceDark = false
}: { className?: string; forceDark?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center">
      {forceDark ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/brand/logo-horizontal-dark.png" alt="NaijaSpa" className={`drop-shadow-[0_1px_8px_rgba(212,175,55,0.28)] ${className}`} />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-horizontal.png" alt="NaijaSpa" className={`dark:hidden ${className}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-horizontal-dark.png" alt="NaijaSpa" className={`hidden drop-shadow-[0_1px_8px_rgba(212,175,55,0.28)] dark:block ${className}`} />
        </>
      )}
    </span>
  );
}
