# NaijaSpa feature audit — 30 October 2026

Local app: http://localhost:3000. API audit plus corrected browser recheck and desktop/mobile search checks.

## Explore follow-up — 31 October 2026

The LAN Explore page's state/all-states handling, reset synchronization, price bounds, full result counts, sorting and safe query parsing have been corrected and tested. All 220 automated tests, lint and TypeScript passed. Desktop/mobile browser checks passed the filter combinations, and a focused check verified long provider names fit both viewports. The public providers are two seeded examples and one retained payment-test fixture; the user chose to keep them visible for testing. Temporary audit providers were removed. Provenance, scope and remaining pagination/scale considerations: [EXPLORE-AUDIT.md](EXPLORE-AUDIT.md).

## OTP security follow-up — 30 October 2026

Local Redis follow-up: standard Redis TCP/TLS support is implemented through `REDIS_URL`, which takes precedence over optional Upstash REST settings. The existing WSL Redis server returned PONG and the application's real atomic counter/rejection check passed. The suite now passes 208 tests. This supersedes the earlier Redis-setup deferral below.

Password-reset challenges now use per-challenge HMAC digests, a persisted five-attempt budget, a 60-second resend cooldown, one active challenge per account, and atomic consumption. Password reset revokes existing sessions; session persistence rejects logins verified against a password hash that changed during the request. All rate-limited handlers now await a Redis-backed atomic limiter, with bounded local counters only in development/test. Redis setup and its real connection test were deferred by the user; production requires its credentials and fails closed if they are absent or unavailable.

The automated suite passed 200 tests. Isolated local security checks exercise concurrent issuance/consumption, account-scoped session revocation, stale-login prevention, expiry and attempt limits. They send no email. Durable email/outbox delivery, SMTP response timing hardening and signup verification remain separate follow-up work. Setup and policy: [AUTH-SECURITY.md](AUTH-SECURITY.md).

## Favourites and search fixes — 30 October 2026

- Saving a service or provider is now idempotent, including concurrent requests and mixed service-only/service-plus-provider requests. A provider-only save remains separate from saves of its individual treatments. Empty, whitespace-only, missing, and mismatched targets are rejected. Saves remain scoped to the signed-in account.
- Migration `20261030160000_favourite_targets` removes empty favourites and keeps one record per duplicate target, preferring an existing provider association for duplicate service saves. It adds service uniqueness, a partial unique index for provider-only saves, and a target-required check. These custom SQL constraints must be preserved in future migrations. The migration was applied successfully to the local database and verified with old duplicate/empty fixture records.
- Search suggestions close after submitting with Enter, selecting a suggestion/recent item by mouse or keyboard, or clearing search. Moving focus between the input and suggestion buttons works without a delayed blur timer. Layout and styling are unchanged.
- All 176 automated tests passed. Six live favourites checks passed, including simultaneous saves, account isolation, and direct database constraint enforcement. Browser checks at 1366px and 390px passed search/result behavior and overlay dismissal. The no-working-hours availability regression also passed. Temporary fixtures were removed.

Repeat: `node scripts/check-search-browser.mjs --standalone` preserves this audit and saves results/screenshots under `.integration-tests/`. Favourites migration verification uses `scripts/test-favourites.mjs --prepare-migration` before applying the migration, then `node scripts/test-favourites.mjs` after applying it; preparation intentionally requires the old unconstrained schema and is not a recurring post-migration test.

All six defects from the original audit below have now been addressed. Remaining integration follow-ups are email SPF/inbox placement, visible device push delivery, Paystack OTP approval and confirmed settlement, contact-form server delivery, and physical-device PWA installation/offline testing. Customer membership purchases remain intentionally disabled.

## Availability and deletion fixes — 30 October 2026

- Live search and home cards now calculate the next appointment from actual weekly hours, eligible active therapists, time off, reserved bookings, service duration, and buffers. Times use Africa/Lagos and a 15-minute grid over the next 14 calendar days. If there is no matching slot, the card does not advertise an appointment time. Demo listings use the generic “Book a time” label. The existing card layout and styling remain unchanged. Availability is a snapshot for the base service; booking submission revalidates the appointment and any extra duration from add-ons.
- Account deletion now atomically cancels the customer's upcoming pending/unpaid bookings and places successfully paid appointments into `refund_pending`, with a pending finance-review record. This does not issue a gateway refund. Pending earnings are cancelled. Completed, in-progress, past, and other customers' bookings are preserved.
- Customer and booking row locks coordinate deletion with new reservations and payment confirmation. New bookings are rejected while deletion is pending, repeated requests preserve the original request date, and late payment cannot reactivate a cancelled appointment. The existing deletion button now reports request failures instead of displaying success.
- All 165 automated tests passed. The isolated local workflow test passed seven checks, including no fabricated times, real time off, booking a calculated slot through the API, concurrent payment/deletion, repeat deletion, late payment, and blocking new reservations. Temporary records were removed. No external charge or refund was sent.

Repeat the focused integration check with the local server running: `npx tsx scripts/test-availability-deletion.ts`.

The original availability and deletion findings below are fixed. The remaining original defects concern duplicate/empty favourites and search suggestions remaining open after submission.

## Integration follow-up — 30 October 2026

The original audit below is historical. Subsequent fixes and checks established:

- Cloudflare R2 credentials passed temporary upload/read/delete checks. The app gallery route also uploaded to the private bucket, served matching bytes through its media URL, and deleted the test image. New R2 uploads do not duplicate image bytes in PostgreSQL; old images are not automatically migrated.
- Notification preferences now persist in the database and passed a save/read integration check. Browser push registration, delivery, a service-worker handler, and a scheduled notification job are implemented. The Google-login browser registered a Mozilla push subscription, and the push service accepted a live test. Visible device delivery remains unconfirmed; the user initially reported no visible alert. The authenticated notification job returned HTTP 200.
- SMTP authentication passed, and the user confirmed receipt of the test email in Spam. Gmail's original headers show DKIM PASS, DMARC PASS, and SPF SOFTFAIL: the outbound relay was not authorized by the existing SPF record. The provider's required relay authorization must be confirmed and merged into the existing SPF TXT record. Inbox placement remains unresolved.
- The sandbox recipient error was resolved for the retained booking by using the explicit sandbox transfer bank mapping, valid lowercase references, and NGN currency. Paystack accepted the ₦90 payout with status `otp`; the earning remains pending until provider confirmation. Admin finance now supports actual OTP submission and transfer verification. In-progress/uncertain transfers cannot be blindly retried.
- The follow-up automated suite passed 144 tests. The unrelated defects in the original audit remain open, except for notification preference persistence.

Setup and operational steps: [CREDENTIALS-SETUP.md](CREDENTIALS-SETUP.md).

Push display follow-up: the user confirmed that the device-only test reports that the browser created and retained its notification, although no visible alert appeared. Windows push services are running. Browser/Windows notification display settings still require checking; remote provider acceptance alone does not confirm visible delivery.

Original audit counts (historical; fixes and current integration limits are recorded above): {"PASS":83,"FAIL":6,"BLOCKED":2,"NOT IMPLEMENTED":1,"PARTIAL":1,"DISABLED":1}

This is 94 distinct checks, including page-render smoke checks and end-to-end API/browser scenarios. Application behavior was audited, not changed to fix the findings below. Repeatable audit scripts and the Playwright development dependency were added.

## Original defects (historical)

| Priority | Finding | Evidence / reproduction |
|---|---|---|
| High | Next-available times are fabricated | A fixture vendor without availability slots still shows a next appointment. `src/lib/next-slot.ts` chooses a static label from a hash of the listing ID. Booking validation uses real schedules, so the displayed suggestion may be unbookable. |
| High | Deletion workflow leaves upcoming bookings active | Requesting deletion for a fixture customer sets `deletionRequestedAt` but leaves its future unpaid booking in `awaiting_payment`. The settings UI promises upcoming bookings will be cancelled. |
| Medium | Notification preferences do not persist | Toggle Offers & promotions in Account settings, then reload. It resets because the values only live in component state. |
| Medium | Duplicate favourites are stored | Two saves of the same fixture service create two favourite records. |
| Medium | Search suggestions obscure submitted results | Submit a search with Enter. The recent/trending panel remains open and overlays the results, including on mobile. Screenshots linked below capture this. |
| Low | Empty favourites are accepted | POST `/api/favourites` with `{}` returns 200 and creates a record without a service or vendor. |

## Original verification and limits (historical)

- Gemini live provider testing passed again with `gemini-3.5-flash-lite`. Its real catalog query returned two results without fallback. Admin provider selection, role permissions, credential hiding, immediate switching and missing-key fallback also passed in `scripts/test-ai-providers.mjs`.
- All 126 automated tests passed. Lint, TypeScript and test-script syntax checks passed.
- SMTP authentication was rechecked without sending mail. The server rejected authentication with `EAUTH`, response `535`. Successful email-backed registration, password-reset delivery and receipts remain blocked until credentials work and a test recipient is chosen.
- Google login was manually verified successfully earlier in this session; the external Google login flow was not repeated by the browser robot.
- Push delivery is not implemented. VAPID key presence does not make delivery work.
- External vendor transfers remain blocked by the previously observed Paystack sandbox recipient errors. This audit checked the safe payout queue, not a successful external transfer.
- The contact form opens an external mail client with `mailto:` and displays “Message sent”; it has no server delivery confirmation.
- PWA asset checks passed. Home-screen installation and offline behavior on physical devices were not fully exercised.
- New audit fixtures were removed. Screenshots and JSON results remain under `.integration-tests/` for inspection.

## Repeat the checks

Keep the local development server running. These scripts refuse remote database targets and use isolated local records:

```sh
node scripts/check-features.mjs
node scripts/check-search-browser.mjs
node scripts/test-ai-providers.mjs
npm test
npm run lint
npm run typecheck
```

The feature audit exits nonzero when it reproduces a defect. On this Windows machine, browser checks use the installed Edge browser in headless mode. A future full run regenerates this report; review its fresh findings afterward.

## Detailed results

Tests used isolated local PostgreSQL records and headless Edge. Test records were removed. Payment confirmation events in this audit were synthetic; no new card charge or transfer was made. Page-render checks do not prove every button works.

| Check | Result | Detail |
|---|---|---|
| Password login and sessions for customer, vendor, admin and analyst | PASS |  |
| Invalid password rejected | PASS |  |
| Registration rejects malformed email and weak password | PASS |  |
| Expired/incorrect password-reset code rejected | PASS |  |
| Customer cannot access admin or vendor APIs | PASS |  |
| Admin creates and publishes category | PASS |  |
| Vendor creates and edits a service | PASS |  |
| Another vendor cannot edit this service | PASS |  |
| Vendor staff creation and deactivation | PASS |  |
| Vendor saves weekly availability | PASS |  |
| Vendor onboarding draft submits successfully | PASS |  |
| Public page / | PASS | Rendered successfully |
| Public page /explore | PASS | Rendered successfully |
| Public page /login | PASS | Rendered successfully |
| Public page /register | PASS | Rendered successfully |
| Public page /forgot | PASS | Rendered successfully |
| Public page /install | PASS | Rendered successfully |
| Public page /offline | PASS | Rendered successfully |
| Public page /category/fixture-category | PASS | Rendered successfully |
| Public page /providers/fixture-vendor | PASS | Rendered successfully |
| Public page /services/feature-massage-fixture-mvuuqtvu | PASS | Rendered successfully |
| Live public provider profile hides Free-plan private contacts | PASS |  |
| Service quote includes the correct home add-on | PASS |  |
| Favourite saves and appears in account list | PASS |  |
| Saving the same favourite twice does not create duplicates | FAIL | Repeated save created duplicate favourite rows  2 !== 1  |
| Favourite requires a service or provider target | FAIL | Empty favourite was accepted  200 !== 400  |
| Concurrent booking requests reserve a slot once | PASS |  |
| Unpaid booking cannot be confirmed or completed by vendor | PASS |  |
| Another customer cannot cancel this booking | PASS |  |
| Paystack test checkout initialization and ownership guards | PASS |  |
| Review rejected before service completion | PASS |  |
| Signed synthetic payment confirms booking exactly once | PASS | Synthetic event only; no gateway charge |
| Customer completes service and payout queues without bank details | PASS |  |
| Completed service can be reviewed and updates vendor rating | PASS |  |
| Duplicate review rejected | PASS |  |
| Vendor gallery create and edit | PASS |  |
| Gallery image upload, database storage and public delivery | PASS |  |
| Free vendor cannot add paid-plan video links | PASS |  |
| Paid subscription enables vendor videos and public-contact eligibility | PASS |  |
| Vendor support ticket, admin reply and resolution | PASS |  |
| Admin CMS create, publish and public page rendering | PASS |  |
| Customer page /account/dashboard | PASS | Rendered successfully |
| Customer page /account/bookings | PASS | Rendered successfully |
| Customer page /account/favourites | PASS | Rendered successfully |
| Customer page /account/payments | PASS | Rendered successfully |
| Customer page /account/reviews | PASS | Rendered successfully |
| Customer page /account/settings | PASS | Rendered successfully |
| Customer page /account/support | PASS | Rendered successfully |
| Vendor page /vendor/dashboard | PASS | Rendered successfully |
| Vendor page /vendor/services | PASS | Rendered successfully |
| Vendor page /vendor/staff | PASS | Rendered successfully |
| Vendor page /vendor/availability | PASS | Rendered successfully |
| Vendor page /vendor/galleries | PASS | Rendered successfully |
| Vendor page /vendor/bookings | PASS | Rendered successfully |
| Vendor page /vendor/earnings | PASS | Rendered successfully |
| Vendor page /vendor/subscriptions | PASS | Rendered successfully |
| Vendor page /vendor/support | PASS | Rendered successfully |
| Vendor page /vendor/analytics | PASS | Rendered successfully |
| Vendor page /vendor/settings | PASS | Rendered successfully |
| Admin page /admin/dashboard | PASS | Rendered successfully |
| Admin page /admin/applications | PASS | Rendered successfully |
| Admin page /admin/vendors | PASS | Rendered successfully |
| Admin page /admin/users | PASS | Rendered successfully |
| Admin page /admin/categories | PASS | Rendered successfully |
| Admin page /admin/services | PASS | Rendered successfully |
| Admin page /admin/bookings | PASS | Rendered successfully |
| Admin page /admin/finance | PASS | Rendered successfully |
| Admin page /admin/commercial | PASS | Rendered successfully |
| Admin page /admin/cms | PASS | Rendered successfully |
| Admin page /admin/support | PASS | Rendered successfully |
| Admin page /admin/ai | PASS | Rendered successfully |
| Admin page /admin/roles | PASS | Rendered successfully |
| Admin page /admin/audit | PASS | Rendered successfully |
| Admin page /admin/settings | PASS | Rendered successfully |
| PWA manifest, icons, service worker and offline page assets | PASS |  |
| Browser customer login and dashboard navigation | PASS |  |
| Browser profile changes persist | PASS |  |
| Browser theme persists after reload | PASS |  |
| Notification preferences persist after reload | FAIL | Offers preference reset after reload; switches only update local component state |
| Browser booking form creates reservation and opens checkout | PASS |  |
| Mobile browsing has no horizontal overflow | PASS |  |
| Browser runtime does not throw JavaScript errors | PASS |  |
| Deletion request cancels upcoming bookings as promised by UI | FAIL | Deletion was requested but upcoming booking was not cancelled + actual - expected  + 'awaiting_payment' - 'cancelled'  |
| Logout revokes the database session | PASS |  |
| Email-backed signup and password-reset delivery | BLOCKED | Requires authenticated email delivery and an explicitly chosen test recipient; no email sent by this audit |
| Push notification delivery | NOT IMPLEMENTED | VAPID keys exist; subscription registration, push handling and sender are not implemented |
| External payout transfer | BLOCKED | Previously rejected by Paystack sandbox recipient validation; safe local payout queue checked here |
| Contact form delivery | PARTIAL | Opens a mailto link and displays Message sent; the app cannot verify external mail delivery |
| Customer membership purchases | DISABLED | Feature intentionally disabled in membership configuration |
| Isolated test-data cleanup | PASS |  |
| Browser keyword search filters live catalog (1366px) | PASS | Search form updates URL and returns the exact fixture service |
| Browser keyword search filters live catalog (390px) | PASS | Search form updates URL and returns the exact fixture service |
| Search suggestions close after submitting query | FAIL | Recent/trending overlay stays open after Enter and covers the mobile results |
| Next-available labels reflect actual schedule | FAIL | A vendor with no availability slots displays a fabricated next-appointment time; src/lib/next-slot.ts hashes the listing ID into static labels |

Search screenshots: [desktop](../.integration-tests/search-feature-b77a0a37ba3a/search-1366.png), [mobile](../.integration-tests/search-feature-b77a0a37ba3a/search-390.png).
