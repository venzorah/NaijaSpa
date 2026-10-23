import { DEFAULT_COMMERCIAL, FREE_ENTITLEMENT, quoteBooking, sanitizePublicVendor, type Entitlement, type LocationType } from "./commercial";
import { CATEGORY_IMAGES } from "./category-images";
import type { HomeCard, HomeRails, NearbyVendor } from "./home-types";
import type { SearchFilters } from "./search-types";

const paidEnt: Entitlement = {
  planCode: "MONTHLY",
  commissionBps: 0,
  publicDirectContact: true,
  enhancedVisibility: true,
  sponsoredEligible: true,
  unlimitedListings: true,
  activePaid: true
};

export const demoCategories = [
  { id: "c1", slug: "massage", name: "Massage therapy", imageUrl: CATEGORY_IMAGES.massage },
  { id: "c2", slug: "spa", name: "Spa treatments", imageUrl: CATEGORY_IMAGES.spa },
  { id: "c3", slug: "facials", name: "Facials and skincare", imageUrl: CATEGORY_IMAGES.facials },
  { id: "c4", slug: "body", name: "Body treatments", imageUrl: CATEGORY_IMAGES.body },
  { id: "c5", slug: "couples", name: "Couples treatments", imageUrl: CATEGORY_IMAGES.couples },
  { id: "c8", slug: "nuru", name: "Nuru massage", imageUrl: CATEGORY_IMAGES.nuru },
  { id: "c6", slug: "packages", name: "Wellness packages", imageUrl: CATEGORY_IMAGES.packages },
  { id: "c7", slug: "beauty", name: "Beauty and relaxation", imageUrl: CATEGORY_IMAGES.beauty }
];

const osun = {
  id: "v-osun",
  slug: "osun-wellness",
  businessName: "Osun Wellness Spa",
  description: "Osun Wellness Spa offers professional spa and wellness treatments in Lekki, Lagos.",
  city: "Lagos",
  neighbourhood: "Lekki",
  verificationStatus: "verified",
  ratingAvg: 4.9,
  reviewCount: 128,
  logoUrl: "/brand/icon-white.png",
  coverUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=80",
  privatePhone: "+2348011111111",
  privateWhatsapp: "+2348011111111",
  entitlement: paidEnt
};

const calm = {
  id: "v-calm",
  slug: "calm-house-ikeja",
  businessName: "Calm House Ikeja",
  description: "Calm House Ikeja offers professional spa and wellness treatments in Ikeja, Lagos.",
  city: "Lagos",
  neighbourhood: "Ikeja",
  verificationStatus: "verified",
  ratingAvg: 4.6,
  reviewCount: 41,
  logoUrl: "/brand/icon-white.png",
  coverUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=80",
  privatePhone: "+2348022222222",
  privateWhatsapp: "+2348022222222",
  entitlement: FREE_ENTITLEMENT
};

const olive = {
  id: "v-olive",
  slug: "olive-room-lekki",
  businessName: "The Olive Room",
  description: "Quiet treatment suites in Lekki Phase 1.",
  city: "Lagos",
  neighbourhood: "Lekki Phase 1",
  verificationStatus: "verified",
  ratingAvg: 4.8,
  reviewCount: 96,
  logoUrl: "/brand/icon-white.png",
  coverUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80",
  privatePhone: "+2348033333333",
  privateWhatsapp: "+2348033333333",
  entitlement: paidEnt
};

export const demoVendors = [osun, calm, olive];

export const demoServices = [
  {
    id: "s-swedish",
    vendorId: osun.id,
    slug: "lekki-swedish-90",
    name: "Swedish massage 90 min",
    description: "Swedish massage 90 min performed by a verified NaijaSpa therapist.",
    imageUrl: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=1200&q=80",
    basePriceKobo: 3500000,
    durationMin: 90,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: true,
    categorySlug: "massage",
    categoryName: "Massage therapy",
    vendor: osun
  },
  {
    id: "s-nuru",
    vendorId: osun.id,
    slug: "nuru-silk-ritual",
    name: "Nuru silk ritual",
    description: "A full-body Nuru oil ritual with long gliding strokes, heat and silk gel for deep relaxation.",
    imageUrl: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
    basePriceKobo: 4500000,
    durationMin: 90,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: true,
    categorySlug: "nuru",
    categoryName: "Nuru massage",
    vendor: osun
  },
  {
    id: "s-couples",
    vendorId: osun.id,
    slug: "couples-ritual",
    name: "Couples ritual",
    description: "Couples ritual performed by a verified NaijaSpa therapist.",
    imageUrl: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80",
    basePriceKobo: 7200000,
    durationMin: 120,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: false,
    categorySlug: "couples",
    categoryName: "Couples treatments",
    vendor: osun
  },
  {
    id: "s-facial",
    vendorId: calm.id,
    slug: "ikeja-facial-60",
    name: "Glow facial 60 min",
    description: "Glow facial 60 min performed by a verified NaijaSpa therapist.",
    imageUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80",
    basePriceKobo: 1800000,
    compareAtKobo: 2400000,
    durationMin: 60,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: false,
    categorySlug: "facials",
    categoryName: "Facials and skincare",
    vendor: calm
  },
  {
    id: "s-home",
    vendorId: calm.id,
    slug: "home-deep-tissue",
    name: "Deep tissue (home or hotel)",
    description: "Deep tissue (home or hotel) performed by a verified NaijaSpa therapist.",
    imageUrl: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
    basePriceKobo: 2500000,
    durationMin: 75,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: true,
    categorySlug: "massage",
    categoryName: "Massage therapy",
    vendor: calm
  },
  {
    id: "s-hotstone",
    vendorId: osun.id,
    slug: "hot-stone-90",
    name: "Hot stone therapy",
    description: "Heated basalt stones layered along the spine for deep muscle release.",
    imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
    basePriceKobo: 3400000,
    durationMin: 90,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: false,
    categorySlug: "spa",
    categoryName: "Spa treatments",
    vendor: osun
  },
  {
    id: "s-sports",
    vendorId: olive.id,
    slug: "sports-recovery-75",
    name: "Sports & recovery",
    description: "Pre-event activation or post-training flush, built around your load.",
    imageUrl: "https://images.unsplash.com/photo-1519824477272-9f4e0cdc4858?auto=format&fit=crop&w=1200&q=80",
    basePriceKobo: 3000000,
    durationMin: 75,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: true,
    categorySlug: "massage",
    categoryName: "Massage therapy",
    vendor: olive
  },
  {
    id: "s-reflex",
    vendorId: calm.id,
    slug: "reflexology-45",
    name: "Reflexology",
    description: "Pressure-point work through the feet, hands and ears.",
    imageUrl: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
    basePriceKobo: 1500000,
    compareAtKobo: 2000000,
    durationMin: 45,
    active: true,
    spaEnabled: true,
    hotelEnabled: false,
    homeEnabled: true,
    categorySlug: "body",
    categoryName: "Body treatments",
    vendor: calm
  },
  {
    id: "s-hammam",
    vendorId: olive.id,
    slug: "olive-hammam-ritual",
    name: "Hammam ritual",
    description: "Steam, black soap and a full-body rinse in a private suite.",
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
    basePriceKobo: 3800000,
    durationMin: 90,
    active: true,
    spaEnabled: true,
    hotelEnabled: false,
    homeEnabled: false,
    categorySlug: "spa",
    categoryName: "Spa treatments",
    vendor: olive
  },
  {
    id: "s-prenatal",
    vendorId: osun.id,
    slug: "prenatal-50",
    name: "Prenatal massage",
    description: "Side-lying, bolstered sessions with certified prenatal specialists only.",
    imageUrl: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80",
    basePriceKobo: 2600000,
    compareAtKobo: 3200000,
    durationMin: 50,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: true,
    categorySlug: "massage",
    categoryName: "Massage therapy",
    vendor: osun
  }
];

export const demoFaqs = [
  {
    id: "f1",
    question: "How do bookings work?",
    answer: "Choose a service, pick Spa/Office, Hotel or Home, select a time, then pay. The booking is only confirmed after payment is verified by NaijaSpa."
  },
  {
    id: "f2",
    question: "Why can’t I see a vendor’s WhatsApp?",
    answer: "Public phone and WhatsApp are available only for vendors on an active paid plan, and only when the number is valid."
  },
  {
    id: "f3",
    question: "What is the hotel or home surcharge?",
    answer: "Administrators configure these amounts. Defaults are ₦0 for Spa/Office and ₦10,000 for Hotel or Home, itemized separately from the service price."
  },
  {
    id: "f4",
    question: "Are these listings live vendors?",
    answer: "On preview hosting without a production database, NaijaSpa shows sample listings. They are removed automatically when a live database is connected."
  }
];

export const demoCms: Record<string, { title: string; body: string }> = {
  about: {
    title: "About NaijaSpa",
    body: "NaijaSpa is a premium spa, massage and wellness marketplace for Nigeria. We connect customers with verified providers."
  },
  contact: { title: "Contact", body: "Maitama, Abuja · concierge@naijaspa.ng" },
  privacy: {
    title: "Privacy",
    body: "We store only what we need to run bookings and accounts. You may request account deletion from settings."
  },
  terms: {
    title: "Terms",
    body: "Bookings are confirmed only after verified payment. Historical financial snapshots are not recalculated when plans change."
  }
};

function publicVendor(v: typeof osun) {
  return sanitizePublicVendor(v, v.entitlement);
}

export function demoSearch(filters: SearchFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const take = 12;
  let rows = demoServices.filter((s) => {
    if (filters.category && s.categorySlug !== filters.category) return false;
    if (filters.city && !s.vendor.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.neighbourhood && !s.vendor.neighbourhood.toLowerCase().includes(filters.neighbourhood.toLowerCase()))
      return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const blob = `${s.name} ${s.description} ${s.vendor.businessName} ${s.categoryName}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (filters.minPrice != null && s.basePriceKobo < filters.minPrice) return false;
    if (filters.maxPrice != null && s.basePriceKobo > filters.maxPrice) return false;
    if (filters.minRating && s.vendor.ratingAvg < filters.minRating) return false;
    if (filters.durationMin && Math.abs(s.durationMin - filters.durationMin) > 15) return false;
    if (filters.locationType === "spa" && !s.spaEnabled) return false;
    if (filters.locationType === "hotel" && !s.hotelEnabled) return false;
    if (filters.locationType === "home" && !s.homeEnabled) return false;
    if (filters.publicContact && !s.vendor.entitlement.publicDirectContact) return false;
    return true;
  });
  if (filters.sort === "price") rows = [...rows].sort((a, b) => a.basePriceKobo - b.basePriceKobo);
  if (filters.sort === "rating") rows = [...rows].sort((a, b) => b.vendor.ratingAvg - a.vendor.ratingAvg);
  const loc = (filters.locationType ?? "spa") as LocationType;
  const results = rows.slice((page - 1) * take, page * take).map((s) => ({
    service: {
      id: s.id,
      slug: s.slug,
      name: s.name,
      durationMin: s.durationMin,
      imageUrl: s.imageUrl,
      category: s.categoryName,
      spaEnabled: s.spaEnabled,
      hotelEnabled: s.hotelEnabled,
      homeEnabled: s.homeEnabled
    },
    vendor: publicVendor(s.vendor),
    sponsored: s.vendor.entitlement.sponsoredEligible,
    enhanced: s.vendor.entitlement.enhancedVisibility,
    quote: quoteBooking({
      basePriceKobo: s.basePriceKobo,
      location: loc,
      entitlement: s.vendor.entitlement,
      config: DEFAULT_COMMERCIAL
    })
  }));
  return { total: rows.length, page, results };
}

function toHomeCard(
  s: (typeof demoServices)[number],
  extra: Partial<Pick<HomeCard, "badge" | "sponsored" | "compareAtKobo">> = {}
): HomeCard {
  const vendor = publicVendor(s.vendor);
  return {
    service: {
      id: s.id,
      slug: s.slug,
      name: s.name,
      imageUrl: s.imageUrl,
      basePriceKobo: s.basePriceKobo,
      durationMin: s.durationMin
    },
    vendor: {
      slug: vendor.slug,
      businessName: vendor.businessName,
      city: vendor.city,
      neighbourhood: vendor.neighbourhood,
      ratingAvg: vendor.ratingAvg,
      reviewCount: vendor.reviewCount,
      verificationStatus: vendor.verificationStatus
    },
    sponsored: extra.sponsored ?? s.vendor.entitlement.sponsoredEligible,
    badge: extra.badge,
    compareAtKobo: extra.compareAtKobo ?? ("compareAtKobo" in s ? (s as { compareAtKobo?: number }).compareAtKobo : undefined)
  };
}

export function demoHomeCards() {
  return demoServices.map((s) => toHomeCard(s));
}

export function demoHomeRails(): HomeRails {
  const byId = (ids: string[], extra?: Partial<Pick<HomeCard, "badge" | "sponsored">>) =>
    ids
      .map((id) => demoServices.find((s) => s.id === id))
      .filter((s): s is (typeof demoServices)[number] => Boolean(s))
      .map((s) => toHomeCard(s, extra));

  return {
    featured: byId(["s-swedish", "s-nuru", "s-couples", "s-hotstone", "s-sports", "s-hammam"], { badge: "Featured", sponsored: true }),
    premium: byId(["s-hammam", "s-couples", "s-swedish", "s-hotstone", "s-prenatal"], { badge: "Premium" }),
    promo: byId(["s-facial", "s-reflex", "s-home", "s-prenatal"], { badge: "Promo" })
  };
}

export function demoNearbyVendors(): NearbyVendor[] {
  return demoVendors.map((v) => ({
    slug: v.slug,
    businessName: v.businessName,
    city: v.city,
    neighbourhood: v.neighbourhood,
    coverUrl: v.coverUrl,
    ratingAvg: v.ratingAvg
  }));
}

export function demoServiceBySlug(slug: string) {
  return demoServices.find((s) => s.slug === slug);
}

export function demoServiceById(id: string) {
  return demoServices.find((s) => s.id === id);
}

export function demoVendorBySlug(slug: string) {
  const vendor = demoVendors.find((v) => v.slug === slug);
  if (!vendor) return null;
  return {
    vendor: publicVendor(vendor),
    description: vendor.description,
    services: demoServices.filter((s) => s.vendorId === vendor.id)
  };
}
