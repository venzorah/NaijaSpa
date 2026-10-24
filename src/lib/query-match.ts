export const CATEGORY_SYNONYMS: Record<string, string> = {
  massage: "swedish deep tissue relaxation prenatal sports recovery",
  spa: "sauna steam ritual hammam hot stone",
  facials: "facial glow skin skincare",
  body: "scrub wrap polish reflexology",
  couples: "duo partners couple couples",
  nuru: "nuru silk oil gel",
  packages: "day spa package",
  beauty: "nails beauty"
};

export const SEARCH_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "available",
  "below",
  "find",
  "for",
  "good",
  "highly",
  "i",
  "in",
  "including",
  "keep",
  "less",
  "looking",
  "me",
  "min",
  "naira",
  "need",
  "of",
  "on",
  "or",
  "please",
  "rated",
  "review",
  "service",
  "services",
  "show",
  "than",
  "the",
  "to",
  "total",
  "treatment",
  "treatments",
  "under",
  "want",
  "with"
]);

export function tokenizeSearch(q?: string | null): string[] {
  if (!q) return [];
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of q.toLowerCase().replace(/₦/g, " ").split(/[^a-z0-9]+/)) {
    if (raw.length < 2 || SEARCH_STOPWORDS.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    tokens.push(raw);
  }
  return tokens.slice(0, 12);
}

export function listingHaystack(parts: Array<string | number | null | undefined>): string {
  return parts
    .filter((part) => part != null && String(part).trim())
    .join(" ")
    .toLowerCase();
}

export function haystackHasToken(haystack: string, token: string): boolean {
  if (!token) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}

export function queryMatchesListing(q: string | undefined, haystack: string, mode: "all" | "any" = "all"): boolean {
  const tokens = tokenizeSearch(q);
  if (!tokens.length) return true;
  const hits = tokens.filter((token) => haystackHasToken(haystack, token));
  return mode === "any" ? hits.length > 0 : hits.length === tokens.length;
}

export function tokenHitCount(q: string | undefined, haystack: string): number {
  return tokenizeSearch(q).filter((token) => haystackHasToken(haystack, token)).length;
}
