# Admin roles and category editor

The existing nine admin roles remain available. **Admin → Roles & permissions** lets a super administrator create custom roles, edit responsibilities and reassign existing administrator accounts. Customers and vendors cannot be promoted through this page. Account reassignment ends that account's sessions and requires a new sign-in.

Custom roles and overrides are stored under `admin.roleDefinitions` in PostgreSQL's `SystemConfig` table. No schema migration is required. A missing configuration uses the existing built-in permissions. Super-administrator access is protected in code; built-in roles cannot be deleted. Custom roles must have no assigned accounts before removal. Changes and assignments use a transaction, a shared advisory lock and an audit entry.

Each authenticated admin request loads the current role responsibilities from the database. Page navigation, server-rendered screens and API checks use those resolved permissions. Removed permissions therefore take effect for existing sessions on their next request. Only super administrators can change roles or assignments, including when another role can view role configuration and system settings.

**Admin → Categories → New category / Edit** opens a modal with three steps:

1. Details: name, slug and description.
2. Image: choose an image or supply a URL.
3. Search & publish: search synonyms, SEO fields and active/draft status.

Back and Next retain the draft. Cancel, Escape or closing the modal discard the draft. Files are staged in the browser and sent only on final save; JPEG, PNG, WebP and GIF are supported up to 2 MB. Existing R2 storage configuration is retained. Public categories still require active status. Display ordering and activation controls remain available in the category list.
