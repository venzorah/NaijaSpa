const BASE = "https://naijaspa.invalid";

function localPath(raw: string | null | undefined): string | null {
  if (!raw?.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u0020]/.test(raw)) return null;
  try {
    const url = new URL(raw, BASE);
    return url.origin === BASE ? url.pathname + url.search + url.hash : null;
  } catch { return null; }
}

export function vendorNext(raw?: string | null): string {
  const path = localPath(raw);
  return path && /^\/vendor(?:\/|\?|#|$)/.test(path) ? path : "/vendor/dashboard";
}

export function vendorCancelPath(raw?: string | null): string {
  const path = localPath(raw);
  return path && !/^\/(?:vendor(?:\/|\?|#|$)|vendor-access(?:\/|\?|#|$)|login(?:\/|\?|#|$)|register(?:\/|\?|#|$)|api(?:\/|\?|#|$))/.test(path)
    ? path : "/account/dashboard";
}

export function vendorReferrerPath(referrer: string | null, host: string | null): string {
  try {
    const url = new URL(referrer || "");
    return url.host === host ? vendorCancelPath(url.pathname + url.search) : "/account/dashboard";
  } catch { return "/account/dashboard"; }
}

export function vendorAccessHref(next: string, back: string): string {
  return `/vendor-access?${new URLSearchParams({ next: vendorNext(next), back: vendorCancelPath(back) })}`;
}
