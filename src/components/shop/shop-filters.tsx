import type { ShopCatalogFilters } from "@/lib/shop/filters";

export function ShopFilters({
  action,
  resetHref,
  categories,
  values
}: {
  action: string;
  resetHref: string;
  categories: { slug: string; name: string }[];
  values: ShopCatalogFilters;
}) {
  const field = "mt-2 h-11 w-full rounded-2xl border border-line bg-bg px-3 text-sm text-ink";
  return (
    <aside className="rounded-[1.5rem] border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink2">Filters</p>
        <a href={resetHref} className="text-sm font-semibold text-goldink">
          Reset
        </a>
      </div>
      <form method="get" action={action} className="mt-5 space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink2">Search</p>
          <input name="q" defaultValue={values.q} className={field} placeholder="Oils, soaps, tools…" aria-label="Search products" />
        </div>
        <fieldset>
          <legend className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink2">Category</legend>
          <div className="mt-3 space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="category" value="" defaultChecked={!values.category} className="accent-goldink" />
              All categories
            </label>
            {categories.map((c) => (
              <label key={c.slug} className="flex cursor-pointer items-start gap-2 text-sm leading-snug">
                <input type="radio" name="category" value={c.slug} defaultChecked={values.category === c.slug} className="mt-0.5 accent-goldink" />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink2">Price (₦)</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input name="min" type="number" min={0} step={500} defaultValue={values.minNaira || ""} className={field} placeholder="Min" aria-label="Minimum price in naira" />
            <input name="max" type="number" min={0} step={500} defaultValue={values.maxNaira || ""} className={field} placeholder="Max" aria-label="Maximum price in naira" />
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink2">Rating</legend>
          <div className="mt-3 space-y-2 text-sm">
            {[
              ["", "Any rating"],
              ["4", "4 stars and up"],
              ["3", "3 stars and up"],
              ["2", "2 stars and up"]
            ].map(([value, label]) => (
              <label key={value || "any"} className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="rating" value={value} defaultChecked={String(values.rating || "") === value} className="accent-goldink" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink2">Sort</p>
          <select name="sort" defaultValue={values.sort} className={field} aria-label="Sort products">
            <option value="new">Newest</option>
            <option value="rating">Top rated</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
        <button className="inline-flex h-11 w-full items-center justify-center rounded-full bg-gold text-sm font-bold text-ongold">Apply filters</button>
      </form>
    </aside>
  );
}
