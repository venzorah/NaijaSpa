import { CustomerHome } from "@/components/customer-home";
import { getHomeCatalog } from "@/lib/catalog";
import type { LivePlace } from "@/lib/nigeria";

export async function HomeFeed({ place }: { place: LivePlace | null }) {
  const { categories, rails, nearby, faqs, hero, spotlight, extraRails, extraNearby, shopProducts, extraShopProducts, layout } = await getHomeCatalog(place);
  return (
    <CustomerHome
      place={place}
      categories={categories}
      rails={rails}
      nearby={nearby}
      faqs={faqs}
      hero={hero}
      spotlight={spotlight}
      extraRails={extraRails}
      extraNearby={extraNearby}
      shopProducts={shopProducts}
      extraShopProducts={extraShopProducts}
      layout={layout}
    />
  );
}
