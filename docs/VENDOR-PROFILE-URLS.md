Vendor public URLs use `vendor-` followed by the normalized business name, for example `/providers/vendor-cazy-luxury-spa`. Numeric suffixes resolve duplicate business names. Updating the business name through onboarding or listing details updates the URL in the same transaction as the profile.

`VendorSlugAlias` reserves previous and current names. Public requests to an old URL receive a permanent redirect to the current URL after the normal approval and visibility checks. Private, suspended and deleted listings remain unavailable. Existing service URLs and booking IDs are unaffected.

The one-time backfill converts existing provider URLs and preserves their old names. The production database is backed up before migration. Changes to admin vendor contact fields are limited to the authorized vendor console; public contact entitlement rules remain in place.
