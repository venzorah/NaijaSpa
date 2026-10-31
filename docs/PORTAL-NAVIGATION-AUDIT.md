# Portal navigation and Explore eligibility — 31 October 2026

All 17 admin sidebar destinations opened with a single click in the local desktop browser check. Several first loads took 6–26 seconds on the development server. The portal previously provided no navigation-pending feedback or route loading boundary, making slow page loads appear unresponsive. Sidebar links now show their pending state, the admin screen selector shows transition progress, and admin/vendor routes have loading boundaries that preserve the portal chrome. Role restrictions remain unchanged.

The specialist account reviewed is active. Its listing is submitted, hidden and unverified, with zero services, staff, documents and availability slots. This is an incomplete listing rather than an Explore search failure. Explore requires an approved, public vendor with at least one active treatment. Staff and working hours complete the appointment setup; a vendor with no assigned staff can use shared business capacity. No prices, treatments, schedules, approval or verification have been invented for the account.

The vendor dashboard now explains whether the listing qualifies for Explore and links to treatment creation, therapist profile setup and working hours. Approval/publication still happens through the existing administrator workflow. Being approved without an active treatment does not create an Explore card.

TypeScript and ESLint passed. Browser checks used short-lived sessions for existing local accounts; those sessions were removed after testing. No application status or listing data was changed. `node scripts/diagnose-portal.mjs` checks desktop links; `--mobile-only` checks the screen selector and mobile drawer. `node scripts/check-vendor-readiness.mjs` verifies the specialist dashboard guidance.

The vendor consoles currently do not expose treatment-to-staff assignment controls. This is a separate roster feature gap; the guidance does not direct users to a nonexistent assignment control.
