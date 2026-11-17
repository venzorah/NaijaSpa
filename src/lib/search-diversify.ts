/** Mix Explore cards so one vendor cannot fill a page with every treatment they offer. */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(items: T[], seed: number) {
  const rand = mulberry32(seed);
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

export function lagosDaySeed(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  return Number(parts.replaceAll("-", ""));
}

export function diversifyByVendor<T>(
  items: T[],
  vendorKey: (item: T) => string,
  shuffleSeed?: number
) {
  const queues = new Map<string, T[]>();
  const order: string[] = [];
  for (const item of items) {
    const key = vendorKey(item);
    let queue = queues.get(key);
    if (!queue) {
      queue = [];
      queues.set(key, queue);
      order.push(key);
    }
    queue.push(item);
  }
  if (shuffleSeed != null) {
    for (const [key, queue] of queues) {
      shuffleInPlace(queue, (shuffleSeed + hashKey(key)) >>> 0);
    }
  }
  const mixed: T[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const key of order) {
      const next = queues.get(key)?.shift();
      if (next) {
        mixed.push(next);
        added = true;
      }
    }
  }
  return mixed;
}

function hashKey(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shouldDiversifyExploreSort(sort?: string) {
  return sort !== "price" && sort !== "rating";
}
