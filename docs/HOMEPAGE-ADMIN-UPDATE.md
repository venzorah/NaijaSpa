# Homepage and advertising controls

The existing hero layout and image category carousel are preserved. Homepage sections now include featured services, recommendations, sponsored partners, popular treatments, verified providers, collections, current offers and published reviews. Sections use database records and the selected state. Unavailable sections are hidden; an empty location offers a link to browse all locations.

Customer membership sales remain disabled, matching the existing product policy. The demo's membership price, provider totals, ratings and promotional discounts are not copied into production.

## Administrator controls

- **Homepage & adverts** (`/admin/hero`): change the main banner and create, edit, pause, order or remove adverts beside it. Site content permission edits banners. Site content or campaign permission manages adverts. Saves invalidate both homepage caches.
- **Sponsored campaigns** (`/admin/campaigns`): create, edit, schedule, prioritise, pause or remove homepage service placements. Dates are edited in Nigeria time. A service must belong to the chosen vendor. Public display still requires an approved, public vendor and active service.
- **Categories** (`/admin/categories`): upload an image during creation, or edit the image afterwards. Images support the existing R2 storage configuration. Categories start inactive and must be activated before specialists can select them.
- **Promo codes**: existing active, unexpired offers appear on the homepage. Redemption limits are considered when displaying offers.

The super-admin role retains all admin screens. A direct Homepage & adverts sidebar entry restores discoverability of an editor previously accessible only through Site content. No other role is granted super-admin access.

Ordinary listings no longer fill the Premium or Promo sections automatically. Paid placements do not change ratings or verification. Popular treatments are ranked using completed booking counts. Reviews must be published and associated with completed bookings.

The former Vercel homepage returned a client exception during the comparison on 2 November 2026; the MagicPatterns reference loaded and was used to compare homepage sections.

The existing Montserrat font files are now served from `public/fonts` with their redistribution license. Typography is preserved and builds no longer fetch Google Fonts.
