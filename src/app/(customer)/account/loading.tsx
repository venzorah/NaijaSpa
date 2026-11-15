export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8" role="status" aria-label="Loading profile">
      <div className="h-24 animate-pulse rounded-3xl border border-line bg-card" />
      <div className="mt-6 h-64 animate-pulse rounded-3xl border border-line bg-card" />
      <p className="sr-only">Opening profile…</p>
    </div>
  );
}
