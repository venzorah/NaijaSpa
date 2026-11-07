# Service URLs

New services use `treatment-name-business-name`, with short numeric suffixes for duplicates. Both vendor and admin service creation use the same database transaction and a PostgreSQL advisory lock to reserve current and previous URL names safely. Existing URLs remain stable when service details or the business name are later edited.

`ServiceSlugAlias` is an additive table. The backfill converts services without an existing alias once and stores their previous URL. Public service lookup applies the usual active-service and public/approved-vendor restrictions before returning data. Old URLs permanently redirect to the current URL with query parameters preserved. Service IDs and booking/payment references are unchanged.

The shared public login component no longer advertises Admin sign in. Staff can still open `/login/admin` directly.
