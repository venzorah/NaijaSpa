# Vendor account access

All vendor pages check the current database-backed session and role in the vendor layout. Guests go to `/login/vendor` with their requested vendor destination. Signed-in non-vendors go to `/vendor-access`; visiting this gate does not end their session. Direct visits to vendor login show the same gate for a non-vendor account. Vendor owners and staff continue to the requested vendor page.

The gate provides Log into Vendor Account, Register as Vendor, and Cancel. Only the first two explicitly call the existing POST logout endpoint, then use a full navigation to discard cached user state. Account-specific booking/onboarding drafts are cleared; theme and location preferences remain. If switching fails, the gate offers retry and Cancel. Cancel returns to the same-site customer referrer when available, otherwise the customer dashboard.

Middleware only forwards the requested vendor path to the layout and overwrites any client-supplied destination header. It does not replace server authorization. Vendor APIs use `requireVendor`, which requires a valid database-backed session, a vendor owner/staff role, and a business membership. Unauthorized API requests return 401/403 without logging the user out. Redirect destinations and Cancel links reject external URLs and authentication/vendor loops.

No role conversion, account creation, payment, or schema migration occurs when displaying the gate.
