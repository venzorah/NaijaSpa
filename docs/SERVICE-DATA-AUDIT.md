# Service details, search and city links — 31 October 2026

The Couples ritual service page uses PostgreSQL, not a separate mock detail page. Explore displays Kemi Therapist, while the page heading displays her vendor, Osun Wellness Spa. Service details now also show the active assigned therapist names so this relationship is clear.

The price, duration, offered settings, provider location, verification flag and paid-plan badge come from stored records and plan entitlements. These are still sample profiles, retained for testing at the user's request. A live database record does not establish a genuine onboarded provider. The two seeded examples had invented review aggregates (4.9/128 and 4.6/41); `scripts/reconcile-sample-reviews.mjs --apply` corrected their aggregates to published-review totals and removed their unchanged seed verification flags. Both have zero published reviews. Future seeds no longer invent review statistics or verification. This did not delete profiles, services or payment history.

The service booking card previously offered four hardcoded times. It now requests `/api/availability?serviceId=...` and offers future slots over 14 days, using the same schedule algorithm as Explore's Next label. It respects working hours, active assigned staff, time off, reserving bookings and buffers. Dates and times use Africa/Lagos. Missing schedules produce no slots. The booking endpoint remains the final availability check because another customer can reserve a time after the page loads. Hidden/unapproved vendors cannot expose public service pages or availability. Selecting another treatment resets the booking card.

The main search bar submits the current filters, supports clear and empty results, and searches active therapist names, services, providers, descriptions, categories and places. Fabricated Recent/Trending suggestions were replaced with real local search history and treatment names from returned database results.

Cities with therapists is already generated from approved public providers with active services. It groups cities/neighbourhoods and counts provider listings, not treatment cards. Browser checks confirmed that clicking Lekki opens its canonical Explore URL and ranks Lekki providers first. Coverage intentionally remains statewide; the city is used for ranking, as in the existing marketplace rules.

Validation: 224 automated tests, TypeScript and ESLint passed. Live Edge checks at 1366px and 390px passed service navigation, matching database names, available-time buttons, keyword search, empty results, clearing search, city navigation and local ranking. Repeat with `node scripts/check-service-journey.mjs`. A separate temporary-fixture check, `node scripts/check-live-service-data.mjs`, verifies price/name updates, schedule removal and hidden-vendor access, then cleans up its records. Existing design and styling are preserved. No production build was run alongside the user's active development server.

## Booking continuation follow-up

A user opened an `explore-audit-*` fixture while the shared-database audit was running; that record was removed at cleanup, leaving an already-open detail page with an invalid service ID. Both the quote and booking lookup previously threw a raw Prisma missing-record error. They now return a clear 404 for missing, inactive, hidden or unapproved services. Quotes also validate offered service locations.

The service card checks the quote again before navigating and shows progress/error feedback. The review page checks HTTP status before accepting a quote, blocks payment until a valid quote for the current service/location has loaded, cancels stale quote requests, and recovers from failed submissions. An unavailable service provides a Back to Explore link. Test listings must be exercised in an isolated database/server when people are browsing the application.

Validation: 233 tests, TypeScript and ESLint passed. `scripts/check-booking-continuation.mjs` uses the retained Couples ritual record and creates no listings or bookings. It checks removed-service handling, stale-page protection, quote loading and failed-request recovery without initiating payment.
