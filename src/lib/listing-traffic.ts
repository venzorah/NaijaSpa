const AD_HOST = /facebook|fbclid|instagram|ig\.me|tiktok|google|gclid|youtube|twitter|t\.co|whatsapp|bing|taboola|outbrain/i;
const BOT_UA = /bot|crawler|spider|crawling|facebookexternalhit|facebot|slackbot|twitterbot|linkedinbot|telegrambot|discordbot|bingpreview|googlebot|applebot|semrush|ahrefs/i;

export type ListingTraffic = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  channel: "ad" | "organic" | "admin";
};

function clip(value: string | null | undefined, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function hostFromReferrer(referrer: string) {
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isTrackingBot(userAgent: string) {
  return BOT_UA.test(userAgent || "");
}

export function listingTrafficFromSearch(
  search: URLSearchParams | Record<string, string | undefined>,
  referrer = "",
  fromAdmin = false
): ListingTraffic {
  const get = (key: string) =>
    search instanceof URLSearchParams ? search.get(key) : search[key];
  const source = clip(get("utm_source") || get("src") || hostFromReferrer(referrer));
  const medium = clip(get("utm_medium"));
  const campaign = clip(get("utm_campaign") || get("campaign"));
  const content = clip(get("utm_content"));
  const term = clip(get("utm_term"));
  const tagged = Boolean(get("utm_source") || get("utm_campaign") || get("utm_medium") || get("src") || get("fbclid") || get("gclid"));
  const referredAd = AD_HOST.test(referrer) || AD_HOST.test(source);
  const channel: ListingTraffic["channel"] = fromAdmin || get("from") === "admin" ? "admin" : tagged || referredAd ? "ad" : "organic";
  return { source, medium, campaign, content, term, channel };
}

export function adLandingPath(kind: "vendor" | "service", slug: string, utm: { source: string; medium?: string; campaign?: string }) {
  const params = new URLSearchParams({
    utm_source: utm.source,
    utm_medium: utm.medium || "paid",
    utm_campaign: utm.campaign || "naijaspa"
  });
  return `/go/${kind === "vendor" ? "v" : "s"}/${encodeURIComponent(slug)}?${params.toString()}`;
}

export function keepTrafficParams(search: URLSearchParams) {
  const next = new URLSearchParams();
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src", "campaign", "fbclid", "gclid", "from"]) {
    const value = search.get(key);
    if (value) next.set(key, value);
  }
  return next;
}
