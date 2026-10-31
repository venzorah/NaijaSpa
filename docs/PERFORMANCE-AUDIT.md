# Performance audit — 31 October 2026

Measurements used the user's running Next.js development server at localhost:3000, not a production build. The profile script creates only short-lived sessions for existing accounts and removes them afterward. It records timings and sizes, not credentials or response bodies.

## Findings

- Local PostgreSQL `SELECT 1` took 56–64 ms for the first connection, then about 1 ms per request; database-reported execution rounded to 0 ms. This does not benchmark every application query, but the connection was not accounting for the multi-second navigation delays observed.
- A fresh browser loaded approximately 3.9 MB of decoded development JavaScript. These measurements exclude the splash by setting its session marker. Browser heading-ready time was roughly 2.8–3.4 seconds. Development compilation, JS execution and local resource pressure remain significant; this is not evidence of production latency.
- The Windows machine had 8 GB RAM total and about 0.96–1.41 GB free during these runs. This is an observation, not a measurement of paging or proof that RAM alone caused every delay.
- `PortalChrome` imported the customer shell just to render the brand. Basic buttons also imported that shell, and the install prompt imported the button back from the shell. This coupled admin/auth code to customer navigation, location and installation components.
- Explore selected entire vendor/staff records despite using only a subset. Homepage availability and entitlements were sequential. Service detail reads were also unnecessarily serialized.
- Admin dashboard queries loaded all customer rows and the complete booking history. Successful-payment metrics were also accidentally limited to 80 records.

## Changes

BrandLogo and GoldButton are separate components with the same markup/styles, removing the cross-portal dependencies and import cycle. Explore selects only the fields it renders/uses. Home requests apply the selected state before limiting the service pool and load entitlement/availability data concurrently. Service details load plan, price config, treatment choices and published reviews concurrently.

The admin dashboard uses database customer counts, bounds chart-history reads to the required date window, and selects only the payment fields used by the page. Payment metrics no longer truncate to the latest 80 payments. There is no cross-user session cache or new cache of live booking availability.

## Measurements

Second complete HTML request in each run, in milliseconds:

| Route | Before | After |
|---|---:|---:|
| Home (Abuja) | 737 | 1,212 |
| Explore | 618 | 566 |
| Couples ritual | 469 | 495 |
| Customer dashboard | 483 | 381 |
| Account settings | 1,593 | 515 |
| Admin dashboard | 991 | 579 |
| Admin applications | 678 | 422 |

Admin decoded development JavaScript fell from 3,920 KB to 3,748 KB (172 KB). Explore was effectively unchanged (3,932 / 3,934 KB). Fresh-browser heading-ready measurements did not improve consistently: Explore 2,801 / 2,906 ms; admin dashboard 2,978 / 3,373 ms. These single-run figures are noisy and do not demonstrate an overall statistically reliable speedup. They distinguish smaller query/dependency costs from the remaining development-mode overhead.

Raw artifacts are `.integration-tests/performance-before.json` and `performance-after.json`. Repeat with `node scripts/profile-performance.mjs` and `node scripts/profile-performance.mjs --after`; `--http-only` skips the browser portion.

All profiled routes returned HTTP 200 after the changes. Tests, TypeScript and lint passed; the dashboard regression includes more than 80 successful payments to verify metric completeness. The active development server was preserved. A production build was not run alongside it, avoiding `.next` and generated Prisma DLL conflicts and additional memory pressure.

## Remaining limits

For day-to-day acceptance/performance testing, use a production build (`npm run build`, then `npm start`) after stopping the dev server. First development visits compile code; the development bundle is not representative of the production bundle. No production latency claim is made here.

Explore currently materializes SQL-filtered candidates for entitlement/relevance ranking before slicing pages. Admin chart reads are bounded by date rather than database-side monthly aggregates. At larger catalog/transaction volumes these need database-paged ranking and aggregate queries. Current data is small and local database probes are fast, so speculative new indexes or Redis caches were not introduced as a substitute for measurement.
