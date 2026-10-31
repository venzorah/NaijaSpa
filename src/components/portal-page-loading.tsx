export function PortalPageLoading() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-5">
      <p className="text-sm text-ink2">Loading page…</p>
      <div aria-hidden="true" className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-lg bg-elev" />
        <div className="h-4 w-64 max-w-full rounded bg-elev" />
        <div className="h-48 rounded-2xl border border-line bg-card" />
      </div>
    </div>
  );
}
