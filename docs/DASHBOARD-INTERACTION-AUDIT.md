# Dashboard interactions — 31 October 2026

Admin entry points are `/login/admin` and `/admin/dashboard`; the customer profile hub is `/account`, with its overview at `/account/dashboard`.

The follow-up review found behavior beyond slow development builds:

- The Next.js development badge intercepted clicks over the bottom-left mobile Home link. `devIndicators: false` removes this development-only click blocker without suppressing runtime error reporting.
- Automatic customer location detection reran on route changes. A delayed lookup could refresh the old route while a customer was navigating. Detection now runs only on the home/bare Explore page, attempts discovery once per mounted shell, cancels on navigation/submission, and ignores stale results or a newer manual place choice. An unchanged location does not refresh Explore. Explicit location URLs remain authoritative. The city picker no longer pushes a new route and immediately refreshes the previous one.
- Admin applications, vendors, customers, bookings, services and support, plus vendor bookings, selected detail records from the entire dataset after filtering. These panels now resolve selection only from visible results and clear actions when no record matches. Vendor row highlighting follows the actual visible selection.
- Admin date-range and screen-selector choices now update immediately while their route transitions are pending.
- Customer navigation, profile links and dashboard cards, plus admin dashboard cards, now use standard Next links with nonblocking pending feedback. A customer route loading boundary complements the admin/vendor boundaries.
- Save profile and Log Out buttons show pending state and recover from failed requests. Theme toggling still works when browser storage is blocked.
- Session lookup is memoized with React's request-scoped cache, avoiding repeated session reads during one server render. It is not cached across requests.

Existing page layout, styling, role checks, prices and publication states were preserved.

## Validation

236 tests passed, including three regression tests that render admin queues and ensure decisions do not target records outside the visible filter. TypeScript and ESLint passed. Vitest now uses automatic JSX transformation, matching the application, to run the component regressions.

Live browser checks used Edge at 1366px and 390px. Checks covered all 14 customer profile links, customer navigation, the dashboard bookings link, theme changes with and without browser storage, profile-submit progress and failure recovery, logout progress and failure recovery, an admin dashboard card, date-range selection, opening/cancelling vendor creation, and admin empty-filter detail states. A delayed-location test holds a route request pending, delivers the old GPS callback, and confirms it cannot refresh/interfere with that navigation. Its pending indicator does not intercept pointer events.

Scripts: `scripts/check-dashboard-interactions.mjs` (or `--admin-only` / `--navigation-only`) and `scripts/check-location-navigation.mjs`. Short-lived sessions are removed on completion; profile, theme and logout mutation requests are mocked. These checks create no provider listings and do not publish, invite, pay, delete or edit customer/business records.

Development compilation can still delay the first visit to a route. This audit does not establish production latency or verify every business action. A production build was not run alongside the user's active development server.
