export const HOME_SECTIONS_CONFIG_KEY = "home.sections";

export const HOME_SECTION_IDS = [
  "featured",
  "nearby",
  "spotlight",
  "collections",
  "premium",
  "promo",
  "bandSpa",
  "bandCouples"
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];
export type HomeSectionSource = "auto" | "manual";
export type HomeSectionPickKind = "services" | "vendors" | "categories";

export type HomeSection = {
  id: HomeSectionId;
  title: string;
  subtitle: string;
  visible: boolean;
  source: HomeSectionSource;
  sortOrder: number;
  serviceIds: string[];
  vendorIds: string[];
  categorySlugs: string[];
};

export const HOME_SECTION_META: Record<
  HomeSectionId,
  { label: string; hint: string; picks: HomeSectionPickKind[] }
> = {
  featured: {
    label: "Featured services",
    hint: "Main service grid. Automatic fills from live ads then nearby listings. Manual uses the services, providers or categories you pick.",
    picks: ["services", "vendors", "categories"]
  },
  nearby: {
    label: "Recommended providers",
    hint: "Provider carousel. Automatic ranks approved vendors in the visitor’s state. Manual shows the providers you pick.",
    picks: ["vendors", "categories"]
  },
  spotlight: {
    label: "Spotlight partners",
    hint: "Sponsored strip. Automatic uses live paid placements. Manual pins chosen services or providers.",
    picks: ["services", "vendors", "categories"]
  },
  collections: {
    label: "Featured collections",
    hint: "The lower “Featured collections” cards only — not the Shop by category carousel under the hero.",
    picks: ["categories"]
  },
  premium: {
    label: "Premium",
    hint: "Paid-plan vendors. Automatic uses the premium rail; manual pins chosen listings.",
    picks: ["services", "vendors", "categories"]
  },
  promo: {
    label: "Promo",
    hint: "Campaign offers. Automatic uses live promo placements; manual pins chosen listings.",
    picks: ["services", "vendors", "categories"]
  },
  bandSpa: {
    label: "Spa story band",
    hint: "Full-width photo band. Link goes to the first selected category, or Spa treatments if none is selected.",
    picks: ["categories"]
  },
  bandCouples: {
    label: "Couples story band",
    hint: "Full-width photo band. Link goes to the first selected category, or Couples treatments if none is selected.",
    picks: ["categories"]
  }
};

export const DEFAULT_HOME_SECTIONS: HomeSection[] = [
  {
    id: "featured",
    title: "Featured services",
    subtitle: "",
    visible: true,
    source: "auto",
    sortOrder: 1,
    serviceIds: [],
    vendorIds: [],
    categorySlugs: []
  },
  {
    id: "nearby",
    title: "Recommended for you",
    subtitle: "",
    visible: true,
    source: "auto",
    sortOrder: 2,
    serviceIds: [],
    vendorIds: [],
    categorySlugs: []
  },
  {
    id: "spotlight",
    title: "Spotlight partners",
    subtitle: "Sponsored placements are paid promotions. Ratings remain from customer bookings.",
    visible: true,
    source: "auto",
    sortOrder: 3,
    serviceIds: [],
    vendorIds: [],
    categorySlugs: []
  },
  {
    id: "collections",
    title: "Featured collections",
    subtitle: "",
    visible: true,
    source: "auto",
    sortOrder: 4,
    serviceIds: [],
    vendorIds: [],
    categorySlugs: []
  },
  {
    id: "premium",
    title: "Premium",
    subtitle: "Paid-plan vendors with enhanced visibility and public contact.",
    visible: true,
    source: "auto",
    sortOrder: 5,
    serviceIds: [],
    vendorIds: [],
    categorySlugs: []
  },
  {
    id: "promo",
    title: "Promo",
    subtitle: "Limited-time prices and campaign offers.",
    visible: true,
    source: "auto",
    sortOrder: 6,
    serviceIds: [],
    vendorIds: [],
    categorySlugs: []
  },
  {
    id: "bandSpa",
    title: "Heat, stone and silence.",
    subtitle: "Hot stone, hammam and deep tissue — book the hour your body has been asking for.",
    visible: true,
    source: "auto",
    sortOrder: 7,
    serviceIds: [],
    vendorIds: [],
    categorySlugs: []
  },
  {
    id: "bandCouples",
    title: "Two tables. One still room.",
    subtitle: "Couples rituals with two therapists, private suites, and prices in Naira.",
    visible: true,
    source: "auto",
    sortOrder: 8,
    serviceIds: [],
    vendorIds: [],
    categorySlugs: []
  }
];

function clampText(value: unknown, fallback: string, max: number) {
  if (typeof value !== "string") return fallback;
  const next = value.trim().slice(0, max);
  return next || fallback;
}

function uniqStrings(value: unknown, max: number, normalize: (item: string) => string) {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (out.length >= max) break;
    if (typeof item !== "string") continue;
    const id = normalize(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function parseHomeSections(raw: string | null | undefined): HomeSection[] {
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const rows = Array.isArray(parsed) ? parsed : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || !("id" in row)) continue;
    byId.set(String((row as { id: unknown }).id), row as Record<string, unknown>);
  }
  const built: HomeSection[] = DEFAULT_HOME_SECTIONS.map((def, index) => {
    const row = byId.get(def.id);
    if (!row) return { ...def, serviceIds: [], vendorIds: [], categorySlugs: [] };
    const rawOrder = Number(row.sortOrder);
    return {
      id: def.id,
      title: clampText(row.title, def.title, 80),
      subtitle: clampText(row.subtitle, def.subtitle, 240),
      visible: row.visible !== false,
      source: row.source === "manual" ? "manual" : "auto",
      sortOrder: Number.isInteger(rawOrder) && rawOrder >= 1 && rawOrder <= HOME_SECTION_IDS.length ? rawOrder : index + 1,
      serviceIds: uniqStrings(row.serviceIds, 48, (id) => id.trim()),
      vendorIds: uniqStrings(row.vendorIds, 48, (id) => id.trim()),
      categorySlugs: uniqStrings(row.categorySlugs, 24, (slug) => slug.trim().toLowerCase())
    };
  });
  return [...built]
    .sort((a, b) => a.sortOrder - b.sortOrder || HOME_SECTION_IDS.indexOf(a.id) - HOME_SECTION_IDS.indexOf(b.id))
    .map((section, index) => ({ ...section, sortOrder: index + 1 }));
}

export function orderedHomeSections(layout: HomeSection[] | undefined) {
  return [...(layout ?? DEFAULT_HOME_SECTIONS)].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function homeSection(layout: HomeSection[] | undefined, id: HomeSectionId): HomeSection {
  return layout?.find((section) => section.id === id) ?? DEFAULT_HOME_SECTIONS.find((section) => section.id === id)!;
}

export function collectedManualServiceIds(layout: HomeSection[]) {
  return [...new Set(layout.flatMap((section) => (section.source === "manual" ? section.serviceIds : [])))];
}

export function collectedManualVendorIds(layout: HomeSection[]) {
  return [...new Set(layout.flatMap((section) => (section.source === "manual" ? section.vendorIds : [])))];
}

export function orderByKeys<T>(items: T[], keys: string[], keyOf: (item: T) => string) {
  const map = new Map(items.map((item) => [keyOf(item), item]));
  const out: T[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const item = map.get(key);
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function curateCategories<T extends { slug: string }>(categories: T[], section: HomeSection, autoLimit?: number) {
  if (!section.visible) return [];
  if (section.source === "manual") {
    return section.categorySlugs.length ? orderByKeys(categories, section.categorySlugs, (item) => item.slug) : [];
  }
  if (section.categorySlugs.length) {
    return categories.filter((item) => section.categorySlugs.includes(item.slug));
  }
  if (autoLimit != null) return categories.slice(0, autoLimit);
  return categories;
}

export function pickManualIds<T>(
  section: HomeSection,
  limit: number,
  resolveService: (id: string) => T | undefined,
  servicesForVendor: (vendorId: string) => T[],
  servicesForCategory: (slug: string) => T[],
  idOf: (item: T) => string
) {
  const out: T[] = [];
  const seen = new Set<string>();
  const add = (item: T | undefined) => {
    if (!item || out.length >= limit) return;
    const id = idOf(item);
    if (seen.has(id)) return;
    seen.add(id);
    out.push(item);
  };
  for (const id of section.serviceIds) add(resolveService(id));
  for (const vendorId of section.vendorIds) {
    for (const item of servicesForVendor(vendorId)) add(item);
  }
  for (const slug of section.categorySlugs) {
    for (const item of servicesForCategory(slug)) add(item);
  }
  return out;
}
