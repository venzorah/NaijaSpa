export const HOME_SECTIONS_CONFIG_KEY = "home.sections";

export const HOME_SECTION_IDS = [
  "featured",
  "nearby",
  "spotlight",
  "collections",
  "premium",
  "promo",
  "bandSpa",
  "bandCouples",
  "shopProducts"
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];
export type HomeSectionSource = "auto" | "manual";
export type HomeSectionPickKind = "services" | "vendors" | "categories" | "products";
export const MAX_HOME_SECTIONS = 24;
export const EXTRA_SECTION_ID = /^extra_[a-z0-9]{8,32}$/;

export type HomeSection = {
  id: string;
  kind?: HomeSectionId;
  title: string;
  subtitle: string;
  visible: boolean;
  source: HomeSectionSource;
  sortOrder: number;
  serviceIds: string[];
  vendorIds: string[];
  categorySlugs: string[];
  productIds: string[];
};

export function isHomeSectionId(id: string): id is HomeSectionId {
  return (HOME_SECTION_IDS as readonly string[]).includes(id);
}

export function isExtraHomeSection(section: Pick<HomeSection, "id">) {
  return EXTRA_SECTION_ID.test(section.id);
}

export function sectionKind(section: Pick<HomeSection, "id" | "kind">): HomeSectionId {
  if (isHomeSectionId(section.id)) return section.id;
  if (section.kind && isHomeSectionId(section.kind)) return section.kind;
  return "featured";
}

export function makeExtraHomeSection(kind: HomeSectionId, sortOrder: number): HomeSection {
  const def = DEFAULT_HOME_SECTIONS.find((row) => row.id === kind) ?? DEFAULT_HOME_SECTIONS[0];
  return {
    ...def,
    id: `extra_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    kind,
    sortOrder,
    visible: true,
    serviceIds: [],
    vendorIds: [],
    categorySlugs: [],
    productIds: []
  };
}

export const HOME_SECTION_META: Record<
  HomeSectionId,
  { label: string; hint: string; picks: HomeSectionPickKind[] }
> = {
  featured: {
    label: "Featured services",
    hint: "Main service grid. Automatic fills from live ads then nearby listings. Manual uses your picks, then still only shows therapists in the visitor’s state.",
    picks: ["services", "vendors", "categories"]
  },
  nearby: {
    label: "Recommended providers",
    hint: "Provider carousel. Automatic ranks approved vendors in the visitor’s state. Manual picks are also limited to that state unless they change location.",
    picks: ["vendors", "categories"]
  },
  spotlight: {
    label: "Spotlight partners",
    hint: "Sponsored strip. Automatic uses live paid placements. Manual pins still hide therapists outside the visitor’s state.",
    picks: ["services", "vendors", "categories"]
  },
  collections: {
    label: "Featured collections",
    hint: "The lower “Featured collections” cards only — not the Shop by category carousel under the hero.",
    picks: ["categories"]
  },
  premium: {
    label: "Premium",
    hint: "Paid-plan vendors. Automatic uses the premium rail; manual pins still filter to the visitor’s state.",
    picks: ["services", "vendors", "categories"]
  },
  promo: {
    label: "Promo",
    hint: "Campaign offers. Automatic uses live promo placements; manual pins still filter to the visitor’s state.",
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
  },
  shopProducts: {
    label: "Shop products",
    hint: "Product carousel on the spa homepage. Links open NaijaSpa Shop. Automatic uses live published products; manual uses only the products you tick. Hidden until you turn it on. Separate from treatments, providers and Shop’s own homepage.",
    picks: ["products"]
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
    categorySlugs: [],
    productIds: []
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
    categorySlugs: [],
    productIds: []
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
    categorySlugs: [],
    productIds: []
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
    categorySlugs: [],
    productIds: []
  },
  {
    id: "premium",
    title: "Premium",
    subtitle: "Paid-plan vendors with enhanced visibility.",
    visible: true,
    source: "auto",
    sortOrder: 5,
    serviceIds: [],
    vendorIds: [],
    categorySlugs: [],
    productIds: []
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
    categorySlugs: [],
    productIds: []
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
    categorySlugs: [],
    productIds: []
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
    categorySlugs: [],
    productIds: []
  },
  {
    id: "shopProducts",
    title: "Shop products",
    subtitle: "Oils, soaps and tools from approved sellers on NaijaSpa Shop.",
    visible: false,
    source: "auto",
    sortOrder: 9,
    serviceIds: [],
    vendorIds: [],
    categorySlugs: [],
    productIds: []
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

function hydrateSection(def: HomeSection, row: Record<string, unknown> | undefined, index: number): HomeSection {
  if (!row) {
    return {
      ...def,
      serviceIds: [...def.serviceIds],
      vendorIds: [...def.vendorIds],
      categorySlugs: [...def.categorySlugs],
      productIds: [...(def.productIds ?? [])]
    };
  }
  const rawOrder = Number(row.sortOrder);
  const rawId = String(row.id || def.id);
  const inferredKind = String(row.kind || def.kind || def.id);
  const kind = isHomeSectionId(rawId) ? rawId : isHomeSectionId(inferredKind) ? inferredKind : sectionKind(def);
  const id = isHomeSectionId(rawId) || EXTRA_SECTION_ID.test(rawId) ? rawId : def.id;
  return {
    id,
    kind,
    title: clampText(row.title, def.title, 80),
    subtitle: clampText(row.subtitle, def.subtitle, 240),
    visible: typeof row.visible === "boolean" ? row.visible : def.visible,
    source: row.source === "manual" ? "manual" : "auto",
    sortOrder: Number.isInteger(rawOrder) && rawOrder >= 1 && rawOrder <= MAX_HOME_SECTIONS ? rawOrder : index + 1,
    serviceIds: kind === "shopProducts" ? [] : uniqStrings(row.serviceIds, 48, (item) => item.trim()),
    vendorIds: kind === "shopProducts" ? [] : uniqStrings(row.vendorIds, 48, (item) => item.trim()),
    categorySlugs: kind === "shopProducts" ? [] : uniqStrings(row.categorySlugs, 24, (slug) => slug.trim().toLowerCase()),
    productIds: kind === "shopProducts" ? uniqStrings(row.productIds, 48, (item) => item.trim()) : []
  };
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
  const extras: Record<string, unknown>[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object" || !("id" in row)) continue;
    const rec = row as Record<string, unknown>;
    const id = String(rec.id);
    if (isHomeSectionId(id)) byId.set(id, rec);
    else if (EXTRA_SECTION_ID.test(id)) extras.push(rec);
  }
  const built: HomeSection[] = DEFAULT_HOME_SECTIONS.map((def, index) => hydrateSection(def, byId.get(def.id), index));
  const extraCap = MAX_HOME_SECTIONS - HOME_SECTION_IDS.length;
  const extraBuilt = extras.slice(0, extraCap).map((row, index) => {
    const kind = isHomeSectionId(String(row.kind || "")) ? (row.kind as HomeSectionId) : "featured";
    const def = DEFAULT_HOME_SECTIONS.find((item) => item.id === kind) ?? DEFAULT_HOME_SECTIONS[0];
    return hydrateSection({ ...def, id: String(row.id), kind }, row, HOME_SECTION_IDS.length + index);
  });
  return [...built, ...extraBuilt]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map((section, index) => ({ ...section, sortOrder: index + 1 }));
}

export function orderedHomeSections(layout: HomeSection[] | undefined) {
  return [...(layout ?? DEFAULT_HOME_SECTIONS)].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function homeSection(layout: HomeSection[] | undefined, id: string): HomeSection {
  return (
    layout?.find((section) => section.id === id) ??
    DEFAULT_HOME_SECTIONS.find((section) => section.id === id) ??
    DEFAULT_HOME_SECTIONS[0]
  );
}

export function collectedManualServiceIds(layout: HomeSection[]) {
  return [...new Set(layout.flatMap((section) => (section.source === "manual" ? section.serviceIds : [])))];
}

export function collectedManualVendorIds(layout: HomeSection[]) {
  return [...new Set(layout.flatMap((section) => (section.source === "manual" ? section.vendorIds : [])))];
}

export function collectedManualProductIds(layout: HomeSection[]) {
  return [...new Set(layout.flatMap((section) => (sectionKind(section) === "shopProducts" && section.source === "manual" ? section.productIds : [])))];
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
