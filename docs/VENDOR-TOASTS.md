# Vendor action notifications

The authenticated vendor layout provides one toast host for the portal. Success, error, and informational notifications use NaijaSpa green/gold styling, theme-aware colours, status icons, and a dismiss button. They remain visible across client navigation and refreshes and appear above editor/billing overlays. Notifications are capped at three, deduplicated for rapid repeats, and pause their dismissal timer during hover, keyboard focus, or a hidden browser tab. Screen readers receive status/alert announcements without focus being moved.

Feedback covers business profile, photos/albums/videos, service creation/editing/availability, staff/schedules, opening hours/blocked time/location toggles, booking updates/CSV export, support requests/replies, listing contact, notifications/preferences/push actions, onboarding, payout account actions, subscription payment errors/cancellation/verification, theme persistence and logout failures. Native invalid-form submissions receive an error toast. Navigation, searching, filtering and typing do not create success notifications.

Success is emitted after the operation succeeds. Failed optimistic location changes roll back, delete endpoints check HTTP outcomes, payment cancellation/pending states are informational, and payment success is announced only after server verification. Bank recipient setup and theme sync report partial completion accurately. Inline validation remains available; redundant successful profile/photo/settings banners are replaced by toasts. Shared components keep their existing behaviour outside the vendor provider.

No new dependency, database migration, payment operation, or change to authorization is required.
