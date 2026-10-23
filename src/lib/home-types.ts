export type HomeCard = {
  service: {
    id: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    basePriceKobo: number;
    durationMin: number;
  };
  vendor: {
    slug: string;
    businessName: string;
    city: string;
    neighbourhood: string;
    ratingAvg: number;
    reviewCount?: number;
    verificationStatus?: string;
    logoUrl?: string | null;
  };
  tags?: string[];
  nextLabel?: string;
  badge?: string;
  sponsored?: boolean;
  compareAtKobo?: number;
};

export type HomeRails = {
  featured: HomeCard[];
  premium: HomeCard[];
  promo: HomeCard[];
};

/** Admin-editable home carousel lengths. VIP on the homepage is the Premium rail. */
export type HomeFeedConfig = {
  featured: number;
  premium: number;
  promo: number;
  nearby: number;
};

export const HOME_FEED_LIMIT_MIN = 1;
export const HOME_FEED_LIMIT_MAX = 24;

export const DEFAULT_HOME_FEED_CONFIG: HomeFeedConfig = {
  featured: 8,
  premium: 8,
  promo: 8,
  nearby: 8
};

export const HOME_FEED_CONFIG_KEYS = {
  featured: "homeFeedFeaturedLimit",
  premium: "homeFeedPremiumLimit",
  promo: "homeFeedPromoLimit",
  nearby: "homeFeedNearbyLimit"
} as const;

function clampHomeFeedLimit(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(HOME_FEED_LIMIT_MAX, Math.max(HOME_FEED_LIMIT_MIN, Math.trunc(value)));
}

export function parseHomeFeedConfig(map: Record<string, string | undefined>): HomeFeedConfig {
  return {
    featured: clampHomeFeedLimit(
      Number(map[HOME_FEED_CONFIG_KEYS.featured] ?? DEFAULT_HOME_FEED_CONFIG.featured),
      DEFAULT_HOME_FEED_CONFIG.featured
    ),
    premium: clampHomeFeedLimit(
      Number(map[HOME_FEED_CONFIG_KEYS.premium] ?? DEFAULT_HOME_FEED_CONFIG.premium),
      DEFAULT_HOME_FEED_CONFIG.premium
    ),
    promo: clampHomeFeedLimit(
      Number(map[HOME_FEED_CONFIG_KEYS.promo] ?? DEFAULT_HOME_FEED_CONFIG.promo),
      DEFAULT_HOME_FEED_CONFIG.promo
    ),
    nearby: clampHomeFeedLimit(
      Number(map[HOME_FEED_CONFIG_KEYS.nearby] ?? DEFAULT_HOME_FEED_CONFIG.nearby),
      DEFAULT_HOME_FEED_CONFIG.nearby
    )
  };
}

export function homeServicePoolTake(limits: HomeFeedConfig) {
  return Math.min(80, Math.max(36, limits.featured + limits.premium + limits.promo + limits.nearby));
}

export type NearbyVendor = {
  slug: string;
  businessName: string;
  city: string;
  neighbourhood: string;
  coverUrl?: string | null;
  ratingAvg: number;
};
