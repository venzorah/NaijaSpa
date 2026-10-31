import {
  DEFAULT_COMMERCIAL,
  FREE_ENTITLEMENT,
  locationAddonKobo,
  quoteBooking,
  sanitizePublicVendor,
  type Entitlement,
  type LocationType
} from "./commercial";
import { PROFILE_GALLERY_TITLE, publicVideoLinks } from "./galleries";
import { CATEGORY_IMAGES } from "./category-images";
import { PHOTOS, firstWellnessPhoto, publicWellnessPhoto } from "./photos";
import {
  DEFAULT_HOME_FEED_CONFIG,
  type HomeCard,
  type HomeFeedConfig,
  type HomeRails,
  type NearbyVendor
} from "./home-types";

export { demoHomeHero } from "./home-hero";
import type { SearchFilters } from "./search-types";
import { CATEGORY_SYNONYMS, listingHaystack, queryMatchesListing, tokenHitCount } from "./query-match";
import { collectExploreCities, type ExploreCityFilters } from "./explore-cities";
import { filterByServiceArea, sortByPlace, vendorMatchesPlace, type LivePlace } from "./nigeria";

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

const PROFILE_STOCK = [PHOTOS.massage, PHOTOS.spa, PHOTOS.facials, PHOTOS.body, PHOTOS.couples, PHOTOS.beauty];

function demoProfileGallery(id: string, urls: string[] = PROFILE_STOCK) {
  return {
    id: `${id}-profile`,
    title: PROFILE_GALLERY_TITLE,
    caption: "Two-up swipe gallery on this listing.",
    images: urls.map((url, i) => ({ id: `${id}-p${i}`, url, therapistName: "", caption: "" }))
  };
}

const osun = {
  id: "v-osun",
  slug: "osun-wellness",
  businessName: "Osun Wellness Spa",
  description: "Osun Wellness Spa offers professional spa and wellness treatments in Lekki, Lagos.",
  state: "Lagos",
  city: "Lagos",
  neighbourhood: "Lekki",
  therapists: [{ id: "t-kemi", name: "Kemi Osun", gender: "female", available: true }],
  verificationStatus: "verified",
  ratingAvg: 4.9,
  reviewCount: 128,
  logoUrl: "/brand/icon-white.png",
  coverUrl: "/photos/band-spa.jpg",
  privatePhone: "+2348011111111",
  privateWhatsapp: "+2348011111111",
  instagramUrl: "@osunwellness",
  owner: { email: "hello@osun.example" },
  cancellationPolicy: "Free cancellation up to 12 hours before the appointment.",
  entitlement: paidEnt,
  galleries: [
    demoProfileGallery("osun"),
    {
      id: "g-osun-1",
      title: "Lekki therapists",
      caption: "Resident team at Osun Wellness.",
      images: [
        { id: "gi-osun-1", url: "/photos/massage.jpg", therapistName: "Kemi Osun", caption: "Lead therapist" },
        { id: "gi-osun-2", url: "/photos/spa.jpg", therapistName: "Adaeze Cole", caption: "Deep tissue" }
      ]
    }
  ],
  videoLinks: [{ id: "vid-osun-1", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Studio tour" }]
};

const calm = {
  id: "v-calm",
  slug: "calm-house-ikeja",
  businessName: "Calm House Ikeja",
  description: "Calm House Ikeja offers professional spa and wellness treatments in Ikeja, Lagos.",
  state: "Lagos",
  city: "Lagos",
  neighbourhood: "Ikeja",
  therapists: [{ id: "t-ibrahim", name: "Ibrahim Musa", gender: "male", available: true }],
  verificationStatus: "verified",
  ratingAvg: 4.6,
  reviewCount: 41,
  logoUrl: "/brand/icon-white.png",
  coverUrl: "/photos/spa.jpg",
  privatePhone: "+2348022222222",
  privateWhatsapp: "+2348022222222",
  instagramUrl: "@calmhouse",
  owner: { email: "calm@example.com" },
  cancellationPolicy: "Free cancellation up to 12 hours before the appointment.",
  entitlement: FREE_ENTITLEMENT,
  galleries: [
    demoProfileGallery("calm", [PHOTOS.facials, PHOTOS.body, PHOTOS.spa, PHOTOS.beauty, PHOTOS.packages, PHOTOS.hero2]),
    {
      id: "g-calm-1",
      title: "Ikeja team",
      caption: "Calm House therapists.",
      images: [{ id: "gi-calm-1", url: "/photos/facials.jpg", therapistName: "Ibrahim Musa", caption: "Facials" }]
    }
  ],
  videoLinks: [{ id: "vid-calm-hidden", url: "https://vimeo.com/123456", title: "Should stay hidden on free" }]
};

const olive = {
  id: "v-olive",
  slug: "olive-room-lekki",
  businessName: "The Olive Room",
  description: "Quiet treatment suites in Lekki Phase 1.",
  state: "Lagos",
  city: "Lagos",
  neighbourhood: "Lekki Phase 1",
  therapists: [{ id: "t-titi", name: "Titi Ade", gender: "female", available: true }],
  verificationStatus: "verified",
  ratingAvg: 4.8,
  reviewCount: 96,
  logoUrl: "/brand/icon-white.png",
  coverUrl: "/photos/bg.jpg",
  privatePhone: "+2348033333333",
  privateWhatsapp: "+2348033333333",
  instagramUrl: "@oliveroom",
  owner: { email: "olive@example.com" },
  cancellationPolicy: "Free cancellation up to 24 hours before the appointment.",
  entitlement: paidEnt,
  galleries: [demoProfileGallery("olive", [PHOTOS.bg, PHOTOS.spa, PHOTOS.couples, PHOTOS.massage, PHOTOS.body, PHOTOS.hero3])],
  videoLinks: []
};

const maitama = {
  id: "v-maitama",
  slug: "maitama-hands",
  businessName: "Maitama Hands",
  description: "Quiet recovery sessions in Maitama, Abuja.",
  state: "FCT",
  city: "Abuja",
  neighbourhood: "Maitama",
  therapists: [{ id: "t-chuka", name: "Chuka Bello", gender: "male", available: true }],
  verificationStatus: "verified",
  ratingAvg: 4.7,
  reviewCount: 54,
  logoUrl: "/brand/icon-white.png",
  coverUrl: "/photos/spa.jpg",
  privatePhone: "+2348044444444",
  privateWhatsapp: "+2348044444444",
  instagramUrl: "@maitamahands",
  owner: { email: "maitama@example.com" },
  cancellationPolicy: "Free cancellation up to 12 hours before the appointment.",
  entitlement: paidEnt,
  galleries: [demoProfileGallery("maitama", [PHOTOS.spa, PHOTOS.massage, PHOTOS.body, PHOTOS.hero1, PHOTOS.packages, PHOTOS.nuru])],
  videoLinks: []
};

export const demoVendors = [osun, calm, olive, maitama];

export const demoReviews = [
  {
    vendorId: osun.id,
    author: "Grace E.",
    rating: 5,
    createdAt: "2026-09-12",
    body: "She found a knot in my shoulder I have had for three years and actually explained what was causing it. Left the room spotless."
  },
  {
    vendorId: osun.id,
    author: "Chidi O.",
    rating: 5,
    createdAt: "2026-08-28",
    body: "Firm pressure without ever being painful. I book the same slot every fortnight now."
  },
  {
    vendorId: osun.id,
    author: "Ifeoma N.",
    rating: 4,
    createdAt: "2026-08-04",
    body: "Excellent prenatal session. Studio was calm; arrive a few minutes early on weekends."
  },
  {
    vendorId: calm.id,
    author: "Tunde A.",
    rating: 5,
    createdAt: "2026-09-02",
    body: "The glow facial was unhurried. Skin felt clean, not stripped. Easy booking through NaijaSpa."
  },
  {
    vendorId: calm.id,
    author: "Amaka K.",
    rating: 4,
    createdAt: "2026-07-19",
    body: "Deep tissue at home was on time and professional. Quote matched what I paid."
  },
  {
    vendorId: olive.id,
    author: "Seyi B.",
    rating: 5,
    createdAt: "2026-09-18",
    body: "Hammam ritual in a private suite. Steam, black soap, then quiet. Worth the trip to Lekki Phase 1."
  },
  {
    vendorId: olive.id,
    author: "Ngozi M.",
    rating: 5,
    createdAt: "2026-08-11",
    body: "Sports recovery before a race weekend. Clear communication and a well-paced session."
  }
];

export function demoReviewsForVendor(vendorId: string) {
  return demoReviews.filter((r) => r.vendorId === vendorId);
}

export const demoServices = [
  {
    id: "s-swedish",
    vendorId: osun.id,
    slug: "lekki-swedish-90",
    name: "Swedish massage 90 min",
    description: "Swedish massage 90 min performed by a verified NaijaSpa therapist.",
    imageUrl: "/photos/massage.jpg",
    basePriceKobo: 3500000,
    durationMin: 90,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: true,
    hotelAddonKobo: 1500000,
    homeAddonKobo: 1000000,
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
    imageUrl: "/photos/nuru.jpg",
    basePriceKobo: 4500000,
    durationMin: 90,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: true,
    hotelAddonKobo: 1500000,
    homeAddonKobo: 1000000,
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
    imageUrl: "/photos/couples.jpg",
    basePriceKobo: 7200000,
    durationMin: 120,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: false,
    hotelAddonKobo: 1500000,
    homeAddonKobo: 1000000,
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
    imageUrl: "/photos/facials.jpg",
    basePriceKobo: 1800000,
    compareAtKobo: 2400000,
    durationMin: 60,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: false,
    hotelAddonKobo: 1500000,
    homeAddonKobo: 1000000,
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
    imageUrl: "/photos/massage.jpg",
    basePriceKobo: 2500000,
    durationMin: 75,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: true,
    hotelAddonKobo: 1500000,
    homeAddonKobo: 1000000,
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
    imageUrl: "/photos/body.jpg",
    basePriceKobo: 3400000,
    durationMin: 90,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: false,
    hotelAddonKobo: 1500000,
    homeAddonKobo: 1000000,
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
    imageUrl: "/photos/massage.jpg",
    basePriceKobo: 3000000,
    durationMin: 75,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: true,
    hotelAddonKobo: 1500000,
    homeAddonKobo: 1000000,
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
    imageUrl: "/photos/body.jpg",
    basePriceKobo: 1500000,
    compareAtKobo: 2000000,
    durationMin: 45,
    active: true,
    spaEnabled: true,
    hotelEnabled: false,
    homeEnabled: true,
    hotelAddonKobo: 1500000,
    homeAddonKobo: 1000000,
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
    imageUrl: "/photos/spa.jpg",
    basePriceKobo: 3800000,
    durationMin: 90,
    active: true,
    spaEnabled: true,
    hotelEnabled: false,
    homeEnabled: false,
    hotelAddonKobo: 1500000,
    homeAddonKobo: 1000000,
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
    imageUrl: "/photos/couples.jpg",
    basePriceKobo: 2600000,
    compareAtKobo: 3200000,
    durationMin: 50,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: true,
    hotelAddonKobo: 1500000,
    homeAddonKobo: 1000000,
    categorySlug: "massage",
    categoryName: "Massage therapy",
    vendor: osun
  },
  {
    id: "s-abuja-swedish",
    vendorId: maitama.id,
    slug: "maitama-swedish-75",
    name: "Maitama Swedish 75 min",
    description: "Swedish massage in Maitama by an available NaijaSpa therapist.",
    imageUrl: "/photos/massage.jpg",
    basePriceKobo: 2800000,
    durationMin: 75,
    active: true,
    spaEnabled: true,
    hotelEnabled: true,
    homeEnabled: true,
    hotelAddonKobo: 1500000,
    homeAddonKobo: 1000000,
    categorySlug: "massage",
    categoryName: "Massage therapy",
    vendor: maitama
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
    question: "What is the hotel or home service add-on?",
    answer: "Spa/Office has no extra charge. Vendors set their own Hotel service and Home service add-on prices. The selected add-on is added to the treatment total."
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
  contact: { title: "Contact", body: "Maitama, Abuja · concierge@naijaspa.com" },
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
  const vendor = sanitizePublicVendor(v, v.entitlement);
  return {
    ...vendor,
    logoUrl: publicWellnessPhoto(vendor.logoUrl, ""),
    coverUrl: firstWellnessPhoto(vendor.coverUrl, PHOTOS.bandSpa)
  };
}

function serviceHaystack(s: (typeof demoServices)[number]) {
  return listingHaystack([
    s.name,
    s.description,
    s.categoryName,
    s.categorySlug,
    CATEGORY_SYNONYMS[s.categorySlug],
    s.vendor.businessName,
    s.vendor.state,
    s.vendor.city,
    s.vendor.neighbourhood,
    ...s.vendor.therapists.map((t) => t.name)
  ]);
}

export function demoSearch(filters: SearchFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const take = Math.min(100, Math.max(1, filters.take ?? 12));
  const matchMode = filters.matchMode ?? "all";
  let rows = demoServices.filter((s) => {
    if (filters.category && s.categorySlug !== filters.category) return false;
    if (!vendorMatchesPlace(s.vendor, filters)) return false;
    const therapists = s.vendor.therapists.filter(
      (t) => t.available && (!filters.gender || t.gender === filters.gender)
    );
    if (therapists.length === 0) return false;
    if (filters.q && !queryMatchesListing(filters.q, serviceHaystack(s), matchMode)) return false;
    if (filters.minPrice != null && s.basePriceKobo < filters.minPrice) return false;
    if (filters.maxPrice != null && s.basePriceKobo > filters.maxPrice) return false;
    if (filters.minRating && s.vendor.ratingAvg < filters.minRating) return false;
    if (filters.verified && s.vendor.verificationStatus !== "verified") return false;
    if (filters.durationMin && Math.abs(s.durationMin - filters.durationMin) > 15) return false;
    if (filters.locationType === "spa" && !s.spaEnabled) return false;
    if (filters.locationType === "hotel" && !s.hotelEnabled) return false;
    if (filters.locationType === "home" && !s.homeEnabled) return false;
    if (filters.publicContact && !s.vendor.entitlement.publicDirectContact) return false;
    return true;
  });
  if (filters.sort === "price") rows = [...rows].sort((a, b) => a.basePriceKobo - b.basePriceKobo);
  if (filters.sort === "rating") rows = [...rows].sort((a, b) => b.vendor.ratingAvg - a.vendor.ratingAvg);
  if (!filters.sort || filters.sort === "relevance") {
    rows = sortByPlace(rows, filters.rankPlace, (s) => s.vendor);
    if (filters.q) {
      rows = [...rows].sort((a, b) => tokenHitCount(filters.q, serviceHaystack(b)) - tokenHitCount(filters.q, serviceHaystack(a)));
    }
  }
  const loc = (filters.locationType ?? "spa") as LocationType;
  const results = rows.slice((page - 1) * take, page * take).map((s) => ({
    service: {
      id: s.id,
      slug: s.slug,
      name: s.name,
      durationMin: s.durationMin,
      imageUrl: firstWellnessPhoto(s.imageUrl, s.vendor.coverUrl, PHOTOS.massage),
      category: s.categoryName,
      spaEnabled: s.spaEnabled,
      hotelEnabled: s.hotelEnabled,
      homeEnabled: s.homeEnabled
    },
    vendor: publicVendor(s.vendor),
    therapists: s.vendor.therapists
      .filter((t) => t.available && (!filters.gender || t.gender === filters.gender))
      .map((t) => ({ id: t.id, name: t.name, gender: t.gender })),
    sponsored: s.vendor.entitlement.sponsoredEligible,
    enhanced: s.vendor.entitlement.enhancedVisibility,
    nextLabel: "Next: Book a time",
    quote: quoteBooking({
      basePriceKobo: s.basePriceKobo,
      location: loc,
      locationAddonKobo: locationAddonKobo(loc, s),
      entitlement: s.vendor.entitlement,
      config: DEFAULT_COMMERCIAL
    })
  }));
  return { total: rows.length, page, results };
}

export function demoExploreCities(opts: ExploreCityFilters = {}) {
  const vendors = demoVendors.filter((v) => v.therapists.some((t) => t.available));
  return collectExploreCities(vendors, opts);
}

function tagsFor(s: { categoryName?: string; spaEnabled?: boolean; hotelEnabled?: boolean; homeEnabled?: boolean }) {
  const tags: string[] = [];
  if (s.categoryName) tags.push(s.categoryName.replace(/ treatments?$/i, ""));
  if (s.spaEnabled) tags.push("Spa");
  if (s.hotelEnabled) tags.push("Hotel");
  if (s.homeEnabled) tags.push("Home");
  return tags.slice(0, 4);
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
      imageUrl: firstWellnessPhoto(s.imageUrl, s.vendor.coverUrl, PHOTOS.massage),
      basePriceKobo: s.basePriceKobo,
      durationMin: s.durationMin
    },
    vendor: {
      slug: vendor.slug,
      businessName: vendor.businessName,
      state: vendor.state,
      city: vendor.city,
      neighbourhood: vendor.neighbourhood,
      ratingAvg: vendor.ratingAvg,
      reviewCount: vendor.reviewCount,
      verificationStatus: vendor.verificationStatus,
      logoUrl: vendor.logoUrl
    },
    tags: tagsFor(s),
    nextLabel: "Next: Book a time",
    sponsored: extra.sponsored ?? s.vendor.entitlement.sponsoredEligible,
    badge: extra.badge,
    compareAtKobo: extra.compareAtKobo ?? ("compareAtKobo" in s ? (s as { compareAtKobo?: number }).compareAtKobo : undefined)
  };
}

export function demoHomeCards() {
  return demoServices.map((s) => toHomeCard(s));
}

export function demoHomeRails(limits: HomeFeedConfig = DEFAULT_HOME_FEED_CONFIG, place?: LivePlace | null): HomeRails {
  const byId = (ids: string[], extra?: Partial<Pick<HomeCard, "badge" | "sponsored">>) =>
    sortByPlace(
      filterByServiceArea(
        ids
          .map((id) => demoServices.find((s) => s.id === id))
          .filter((s): s is (typeof demoServices)[number] => Boolean(s))
          .map((s) => toHomeCard(s, extra)),
        place,
        (c) => c.vendor
      ),
      place,
      (c) => c.vendor
    );

  return {
    featured: byId(["s-swedish", "s-nuru", "s-couples", "s-hotstone", "s-sports", "s-hammam"], { badge: "Featured", sponsored: true }).slice(
      0,
      limits.featured
    ),
    premium: byId(["s-hammam", "s-couples", "s-swedish", "s-hotstone", "s-prenatal"], { badge: "Premium" }).slice(0, limits.premium),
    promo: byId(["s-facial", "s-reflex", "s-home", "s-prenatal"], { badge: "Promo" }).slice(0, limits.promo)
  };
}

export function demoNearbyVendors(): NearbyVendor[] {
  return demoVendors.map((v) => ({
    slug: v.slug,
    businessName: v.businessName,
    state: v.state,
    city: v.city,
    neighbourhood: v.neighbourhood,
    coverUrl: firstWellnessPhoto(v.coverUrl, PHOTOS.bandSpa),
    ratingAvg: v.ratingAvg
  }));
}

export function demoTreatmentsForVendor(vendorId: string) {
  return demoServices
    .filter((s) => s.vendorId === vendorId && s.active)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      durationMin: s.durationMin,
      basePriceKobo: s.basePriceKobo
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
    services: demoServices.filter((s) => s.vendorId === vendor.id),
    galleries: vendor.galleries ?? [],
    videoLinks: publicVideoLinks(vendor.videoLinks ?? [], vendor.entitlement)
  };
}
