# Vendor portal UI

The vendor portal follows the supplied MagicPatterns vendor reference while using NaijaSpa's existing database, authentication, entitlement checks, payment and upload workflows. Its styles are scoped to `.vendor-portal`; customer and administrator screens retain their styling. Both light and dark modes remain available.

## Screens

The sidebar retains Dashboard, Bookings, Availability, Business profile, Listing details, Services, Staff & schedules, Galleries, Earnings & payouts, Subscription, Analytics, Sponsored, Settings and Support.

New routes:

- `/vendor/notifications`: account-scoped notifications and mark-read controls.
- `/vendor/settings/notifications`: persisted email/reminder preferences and existing browser push controls.
- `/vendor/settings/team`: business owner and linked staff accounts. Therapist management stays in Staff & schedules; portal login provisioning stays with support.
- `/vendor/settings/security`: sign-in information, active session count and the existing email-based password reset flow.
- `/vendor/support/help`: practical links to the application's working vendor features.
- `/vendor/subscriptions/billing`: compatibility redirect to the billing-history modal on Subscription.

Bookings use a searchable table, existing status transitions in a detail modal, and CSV export of the filtered loaded bookings. The backend remains authoritative for payments and transitions. CSV text is escaped against spreadsheet formula interpretation.

Availability includes week/month navigation, actual appointments and therapist time-off, plus the existing hours/location/block controls. Staff includes today's shifts and appointments. Calendar dates and dashboard day boundaries use Africa/Lagos (UTC+1).

Business profile has a single saveable form, public preview, owned gallery image selection for cover/logo, and links to existing gallery uploads, availability and onboarding. Saving does not approve or publish a listing. Gallery image replacement preserves existing images.

Support now displays public conversation messages and allows replies to an account's own open tickets. Internal notes and internal messages are excluded from vendor reads and responses. Resolved/closed tickets cannot receive new vendor replies.

Subscription follows the reference's current-plan/savings overview, compact plan cards and feature comparison. Prices, durations and benefits come from the live plan configuration. Monthly savings compare completed bookings' recorded commission with today's Free commission rate. Existing checkout links and owner-only payment access remain in place; renewal support reflects the existing manual renewal workflow.

The top Billing history button opens a responsive modal. History is fetched only while open from `/api/vendor/subscriptions/billing`, with ten payments per page, reference search, safe display fields and vendor ownership filtering. Keyboard focus stays inside the modal; Escape, the close button, Done and the backdrop close it. Loading, empty, error and retry states are included.

The reference's fake statistics, saved card numbers, sample bank details, payout release promises, automatic renewals and preview role switches are not used. Existing vendor campaign creation/pause controls are retained. Profile-view tracking, campaign attribution and market benchmarks are not implemented by this UI update.

## Validation

`npm run typecheck`, `npm test`, production build, and authenticated desktop/mobile browser checks cover the portal. Regression tests exercise ticket ownership/privacy, media ownership, notification scope and Nigerian calendar boundaries. No schema migration is required.
