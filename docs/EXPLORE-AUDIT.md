# Explore filters and provider data — 31 October 2026

Page reviewed: `http://192.168.109.175:3000/explore`.

## Provider provenance

The page reads the connected PostgreSQL database. That does not make every record a real onboarded provider: the public dataset contains examples and an integration-test account.

| Visible provider | Displayed therapist | Source |
|---|---|---|
| Osun Wellness Spa | Kemi Therapist | `prisma/seed.ts`, sample paid vendor |
| Calm House Ikeja | Ibrahim Therapist | `prisma/seed.ts`, sample free vendor |
| Integration test fixture | Test therapist | Retained Paystack integration fixture |

These profiles supply five active treatments in total. Explore cards represent treatments, so the same provider can appear on more than one card. The seed script previously assigned example ratings, review counts and verified flags. During the service-detail follow-up, the two unchanged seeded badges were cleared and review totals reconciled against published reviews (both now zero). New seeds start unverified with no reviews. Bundled/fallback wellness images do not verify a provider's identity.

One additional submitted profile is unpublished and has no active services. This audit does not establish that profile's real-world business identity.

The user explicitly chose **Keep visible for testing**. Existing sample accounts, their services, and retained payment history were preserved. All temporary providers, services and categories created by the filter audit were removed. Before publishing a real marketplace, use genuine vendor onboarding/review and remove the examples from public production listings.

Repeat the read-only provenance check: `node scripts/audit-explore-data.mjs`. Its report excludes private owner contact details and unpublished profile names.

## Fixes

- All states now clears the state, city and area filter. A stored device location ranks results without silently becoming an active state filter on the bare Explore URL.
- Reset clears active filters and synchronizes both keyword fields and the price slider. Browser URL changes also synchronize these controls.
- Combined minimum/maximum price filters retain both bounds. Price values are converted to integer kobo, and invalid/overflowing numeric URL parameters cannot reach Prisma.
- Counts cover the full eligible result set; sorting and eligibility filtering happen before page slicing. Ties have stable ordering. Availability is computed only for the returned page.
- Changing sort returns to the first page. State, specialty, setting, verification and keyword changes preserve other applied filters while resetting the page.
- The upper slider position is explicitly shown as `₦80,000+`, reflecting its existing unlimited-price behavior.
- State/sort/search/range controls have explicit accessible names. Long provider names wrap within cards. Existing layout, colors, typography and controls were preserved.
- Demo-mode verified filtering now applies the same flag check as the database-backed mode.

## Verification

All 220 automated tests passed, along with ESLint and TypeScript. Live Edge checks used the LAN page at desktop (1366px) and mobile (390px) widths. Temporary data included 29 public treatments across Lagos/FCT with distinct prices, categories, settings, ratings, therapist genders and verification flags, plus a hidden listing that must not appear.

The functional checks passed for:

- All states with a saved Lagos cookie; selecting Lagos/FCT and clearing location.
- Specialty selection and toggle-off.
- Home, studio and venue settings; setting plus verified-only filtering.
- Price adjustment using pointer and keyboard; empty results and reset recovery.
- Keyword submission from the sidebar and synchronization after reset.
- Global price/rating order, accurate counts, second-page contents and resetting the page on a sort change.
- Combined price bounds, gender, minimum rating/duration and malformed query parameters.

A separate targeted regression check passed long-name wrapping and viewport containment at both widths after the functional checks. Browser artifacts are stored under `.integration-tests/explore-audit-*/`. Repeat with `node scripts/check-explore-filters.mjs`; add `--layout-only` for the focused wrapping check. The script refuses remote database fixture writes.

Explore now displays 10 results per page, with numbered page links, Previous/Next controls and a showing-range summary. Navigation preserves the location, search and filters; out-of-range pages redirect to the last valid page. Controls are hidden when a result set fits on one page. Run `node scripts/check-explore-filters.mjs --pagination-only` for focused desktop/mobile coverage using temporary listings. Current eligibility/relevance handling materializes the SQL-filtered candidate set before paging; large-catalog scale should move that ranking/eligibility work into a database-paged query. These checks validate behavior, not large-scale performance.

Validation used the running development server. A production build was not run alongside it, avoiding the shared `.next` directory and Prisma DLL conflicts encountered earlier.
