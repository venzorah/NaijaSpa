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
  };
  badge?: string;
  sponsored?: boolean;
  compareAtKobo?: number;
};

export type HomeRails = {
  featured: HomeCard[];
  premium: HomeCard[];
  promo: HomeCard[];
};

export type NearbyVendor = {
  slug: string;
  businessName: string;
  city: string;
  neighbourhood: string;
  coverUrl?: string | null;
  ratingAvg: number;
};
